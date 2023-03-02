const ENDLESS_KEYWORDS = ["hero", "spell", "stash", "say", "warp", "loot", "end", "ember", "frost"];

class EndlessTokenizer {
  static stripComment(line) {
    let inString = false;
    let result = "";

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];

      if (character === '"') {
        inString = !inString;
      }

      if (character === "#" && !inString) {
        break;
      }

      result += character;
    }

    return result;
  }

  static tokenizeSource(source) {
    return source
      .split(/\r?\n/)
      .map((line, index) => {
        const text = EndlessTokenizer.stripComment(line).trim();

        if (!text) {
          return null;
        }

        return {
          lineNumber: index + 1,
          tokens: text.match(/"[^"]*"|>=|<=|==|!=|\|\||&&|[()=+\-*/<>!]|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?/g) || []
        };
      })
      .filter(Boolean);
  }

  static tokenizeExpression(source) {
    const text = EndlessTokenizer.stripComment(
      source.replace(/\r?\n/g, " ")
    ).trim();

    if (!text) {
      return [];
    }

    return (
      text.match(
        /"[^"]*"|>=|<=|==|!=|\|\||&&|[()=+\-*/<>!]|[A-Za-z_][A-Za-z0-9_]*|\d+(?:\.\d+)?/g
      ) || []
    );
  }
}

class ExpressionParser {
  constructor(tokens, lineNumber) {
    this.tokens = tokens;
    this.index = 0;
    this.lineNumber = lineNumber;
  }

  parse() {
    if (!this.tokens.length) {
      throw new Error(`Line ${this.lineNumber}: expected an expression.`);
    }

    const expression = this.parseLogicalOr();

    if (this.index < this.tokens.length) {
      throw new Error(`Line ${this.lineNumber}: unexpected token "${this.peek()}".`);
    }

    return expression;
  }

  peek() {
    return this.tokens[this.index];
  }

  consume() {
    const token = this.tokens[this.index];
    this.index += 1;
    return token;
  }

  match(...choices) {
    const token = this.peek();

    if (choices.includes(token)) {
      this.consume();
      return token;
    }

    return null;
  }

  parseLogicalOr() {
    let expression = this.parseLogicalAnd();

    while (this.match("||")) {
      expression = {
        type: "binary",
        operator: "||",
        left: expression,
        right: this.parseLogicalAnd()
      };
    }

    return expression;
  }

  parseLogicalAnd() {
    let expression = this.parseEquality();

    while (this.match("&&")) {
      expression = {
        type: "binary",
        operator: "&&",
        left: expression,
        right: this.parseEquality()
      };
    }

    return expression;
  }

  parseEquality() {
    let expression = this.parseComparison();
    let operator = this.match("==", "!=");

    while (operator) {
      expression = {
        type: "binary",
        operator,
        left: expression,
        right: this.parseComparison()
      };
      operator = this.match("==", "!=");
    }

    return expression;
  }

  parseComparison() {
    let expression = this.parseTerm();
    let operator = this.match(">", "<", ">=", "<=");

    while (operator) {
      expression = {
        type: "binary",
        operator,
        left: expression,
        right: this.parseTerm()
      };
      operator = this.match(">", "<", ">=", "<=");
    }

    return expression;
  }

  parseTerm() {
    let expression = this.parseFactor();
    let operator = this.match("+", "-");

    while (operator) {
      expression = {
        type: "binary",
        operator,
        left: expression,
        right: this.parseFactor()
      };
      operator = this.match("+", "-");
    }

    return expression;
  }

  parseFactor() {
    let expression = this.parseUnary();
    let operator = this.match("*", "/");

    while (operator) {
      expression = {
        type: "binary",
        operator,
        left: expression,
        right: this.parseUnary()
      };
      operator = this.match("*", "/");
    }

    return expression;
  }

  parseUnary() {
    const operator = this.match("!", "-");

    if (operator) {
      return {
        type: "unary",
        operator,
        value: this.parseUnary()
      };
    }

    if (this.match("warp")) {
      const spellName = this.consume();

      if (!ExpressionParser.isIdentifier(spellName)) {
        throw new Error(`Line ${this.lineNumber}: warp must be followed by a spell name.`);
      }

      return {
        type: "call",
        spellName
      };
    }

    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.consume();

    if (!token) {
      throw new Error(`Line ${this.lineNumber}: expression ended too early.`);
    }

    if (token === "(") {
      const expression = this.parseLogicalOr();

      if (!this.match(")")) {
        throw new Error(`Line ${this.lineNumber}: missing closing ")".`);
      }

      return expression;
    }

    if (/^"[^"]*"$/.test(token)) {
      return { type: "literal", value: token.slice(1, -1) };
    }

    if (/^\d+(\.\d+)?$/.test(token)) {
      return { type: "literal", value: Number(token) };
    }

    if (token === "ember" || token === "frost") {
      return { type: "literal", value: token === "ember" };
    }

    if (ExpressionParser.isIdentifier(token)) {
      return { type: "identifier", name: token };
    }

    throw new Error(`Line ${this.lineNumber}: unexpected token "${token}".`);
  }

  static isIdentifier(token) {
    return /^[A-Za-z_][A-Za-z0-9_]*$/.test(token) && !ENDLESS_KEYWORDS.includes(token);
  }
}

class EndlessParser {
  constructor(source) {
    this.lines = EndlessTokenizer.tokenizeSource(source);
    this.index = 0;
  }

  parse() {
    const program = {
      entrySpell: "",
      spells: [],
      spellsByName: {}
    };

    while (!this.isAtEnd()) {
      const line = this.peekLine();
      const keyword = line.tokens[0];

      if (keyword === "hero") {
        program.entrySpell = this.readName(line, 1, "hero");
        this.index += 1;
        continue;
      }

      if (keyword === "spell") {
        const spell = this.parseSpell();
        if (program.spellsByName[spell.name]) {
          throw new Error(`Line ${spell.lineNumber}: spell "${spell.name}" is already defined.`);
        }
        program.spells.push(spell);
        program.spellsByName[spell.name] = spell;
        continue;
      }

      throw new Error(`Line ${line.lineNumber}: expected hero or spell but found "${keyword}".`);
    }

    if (!program.spells.length) {
      throw new Error("Write at least one spell.");
    }

    if (!program.entrySpell) {
      program.entrySpell = program.spells[0].name;
    }

    if (!program.spellsByName[program.entrySpell]) {
      throw new Error(`The hero spell "${program.entrySpell}" has not been defined.`);
    }

    return program;
  }

  parseSpell() {
    const header = this.consumeLine();
    const spellName = this.readName(header, 1, "spell");
    const locals = new Set();
    const calls = new Set();
    const spell = {
      name: spellName,
      body: [],
      locals: [],
      calls: [],
      lineNumber: header.lineNumber
    };

    while (!this.isAtEnd()) {
      const line = this.peekLine();
      const keyword = line.tokens[0];

      if (keyword === "end") {
        this.index += 1;
        spell.locals = Array.from(locals);
        spell.calls = Array.from(calls);
        return spell;
      }

      spell.body.push(this.parseStatement(locals, calls));
    }

    throw new Error(`Line ${header.lineNumber}: spell "${spellName}" is missing an end.`);
  }

  parseStatement(locals, calls) {
    const line = this.consumeLine();
    const keyword = line.tokens[0];

    if (keyword === "stash") {
      const name = this.readName(line, 1, "stash");
      this.expectToken(line, 2, "=");
      const expression = this.parseExpression(line.tokens.slice(3), line.lineNumber, calls);
      locals.add(name);
      return {
        type: "stash",
        name,
        expression,
        lineNumber: line.lineNumber
      };
    }

    if (keyword === "say" || keyword === "loot") {
      return {
        type: keyword,
        expression: this.parseExpression(line.tokens.slice(1), line.lineNumber, calls),
        lineNumber: line.lineNumber
      };
    }

    if (keyword === "warp") {
      const spellName = this.readName(line, 1, "warp");
      calls.add(spellName);
      return {
        type: "warp",
        spellName,
        lineNumber: line.lineNumber
      };
    }

    throw new Error(`Line ${line.lineNumber}: "${keyword}" is not valid in this basic version.`);
  }

  parseExpression(tokens, lineNumber, calls) {
    const expression = new ExpressionParser(tokens, lineNumber).parse();
    EndlessParser.collectCalls(expression, calls);
    return expression;
  }

  readName(line, index, owner) {
