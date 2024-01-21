const ENDLESS_KEYWORDS = ["hero", "spell", "stash", "say", "warp", "loot", "ifso", "otherwise", "end", "ember", "frost"];

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

    spell.body = this.parseStatements(locals, calls, ["end"]);

    if (this.isAtEnd() || this.peekLine().tokens[0] !== "end") {
      throw new Error(`Line ${header.lineNumber}: spell "${spellName}" is missing an end.`);
    }

    this.index += 1;
    spell.locals = Array.from(locals);
    spell.calls = Array.from(calls);
    return spell;
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

    if (keyword === "ifso") {
      const condition = this.parseExpression(line.tokens.slice(1), line.lineNumber, calls);
      const thenBody = this.parseStatements(locals, calls, ["otherwise", "end"]);
      let elseBody = [];

      if (!this.isAtEnd() && this.peekLine().tokens[0] === "otherwise") {
        this.index += 1;
        elseBody = this.parseStatements(locals, calls, ["end"]);
      }

      if (this.isAtEnd() || this.peekLine().tokens[0] !== "end") {
        throw new Error(`Line ${line.lineNumber}: ifso is missing an end.`);
      }

      this.index += 1;

      return {
        type: "ifso",
        condition,
        thenBody,
        elseBody,
        lineNumber: line.lineNumber
      };
    }

    throw new Error(`Line ${line.lineNumber}: "${keyword}" is not valid in this basic version.`);
  }

  parseStatements(locals, calls, stopKeywords) {
    const statements = [];

    while (!this.isAtEnd()) {
      const keyword = this.peekLine().tokens[0];

      if (stopKeywords.includes(keyword)) {
        return statements;
      }

      statements.push(this.parseStatement(locals, calls));
    }

    return statements;
  }

  parseExpression(tokens, lineNumber, calls) {
    const expression = new ExpressionParser(tokens, lineNumber).parse();
    EndlessParser.collectCalls(expression, calls);
    return expression;
  }

  readName(line, index, owner) {
    const token = line.tokens[index];

    if (!ExpressionParser.isIdentifier(token)) {
      throw new Error(`Line ${line.lineNumber}: ${owner} must be followed by a name.`);
    }

    return token;
  }

  expectToken(line, index, expected) {
    if (line.tokens[index] !== expected) {
      throw new Error(`Line ${line.lineNumber}: expected "${expected}".`);
    }
  }

  consumeLine() {
    const line = this.lines[this.index];
    this.index += 1;
    return line;
  }

  peekLine() {
    return this.lines[this.index];
  }

  isAtEnd() {
    return this.index >= this.lines.length;
  }

  static collectCalls(expression, calls) {
    if (!expression) {
      return;
    }

    if (expression.type === "call") {
      calls.add(expression.spellName);
      return;
    }

    if (expression.type === "binary") {
      EndlessParser.collectCalls(expression.left, calls);
      EndlessParser.collectCalls(expression.right, calls);
      return;
    }

    if (expression.type === "unary") {
      EndlessParser.collectCalls(expression.value, calls);
    }
  }
}

class EndlessInterpreter {
  constructor(program) {
    this.program = program;
    this.output = [];
    this.callDepth = 0;
  }

  run() {
    return {
      program: this.program,
      output: this.output,
      lastLoot: this.executeSpell(this.program.entrySpell)
    };
  }

  executeSpell(spellName) {
    const spell = this.program.spellsByName[spellName];

    if (!spell) {
      throw new Error(`Spell "${spellName}" does not exist.`);
    }

    this.callDepth += 1;

    if (this.callDepth > 20) {
      throw new Error("Too many nested warps.");
    }

    const scope = {};

    try {
      for (const statement of spell.body) {
        const result = this.executeStatement(statement, scope);

        if (result.returned) {
          return result.value;
        }
      }

      return null;
    } finally {
      this.callDepth -= 1;
    }
  }

  executeStatement(statement, scope) {
    if (statement.type === "stash") {
      scope[statement.name] = this.evaluateExpression(statement.expression, scope);
      return { returned: false, value: null };
    }

    if (statement.type === "say") {
      this.output.push(String(this.evaluateExpression(statement.expression, scope)));
      return { returned: false, value: null };
    }

    if (statement.type === "warp") {
      this.executeSpell(statement.spellName);
      return { returned: false, value: null };
    }

    if (statement.type === "loot") {
      return {
        returned: true,
        value: this.evaluateExpression(statement.expression, scope)
      };
    }

    if (statement.type === "ifso") {
      const branch = this.evaluateExpression(statement.condition, scope)
        ? statement.thenBody
        : statement.elseBody;

      for (const branchStatement of branch) {
        const result = this.executeStatement(branchStatement, scope);

        if (result.returned) {
          return result;
        }
      }

      return { returned: false, value: null };
    }

    throw new Error(`Unknown statement type "${statement.type}".`);
  }

  evaluateExpression(expression, scope) {
    return evaluateAst(expression, scope, {
      executeSpell: (spellName) => this.executeSpell(spellName)
    });
  }
}

function evaluateAst(expression, scope, runtime) {
  if (expression.type === "literal") {
    return expression.value;
  }

  if (expression.type === "identifier") {
    if (!(expression.name in scope)) {
      throw new Error(`"${expression.name}" has not been stashed yet.`);
    }
    return scope[expression.name];
  }

  if (expression.type === "call") {
    if (!runtime || typeof runtime.executeSpell !== "function") {
      throw new Error('warp only works when you define spells.');
    }
    return runtime.executeSpell(expression.spellName);
  }

  if (expression.type === "unary") {
    const value = evaluateAst(expression.value, scope, runtime);

    if (expression.operator === "!") {
      return !value;
    }

    if (expression.operator === "-") {
      return -value;
    }
  }

  if (expression.type === "binary") {
    const left = evaluateAst(expression.left, scope, runtime);
    const right = evaluateAst(expression.right, scope, runtime);

    if (expression.operator === "+") {
      return typeof left === "string" || typeof right === "string"
        ? `${left}${right}`
        : left + right;
    }

    if (expression.operator === "-") {
      return left - right;
    }

    if (expression.operator === "*") {
      return left * right;
    }

    if (expression.operator === "/") {
      return left / right;
    }

    if (expression.operator === ">") {
      return left > right;
    }

    if (expression.operator === "<") {
      return left < right;
    }

    if (expression.operator === ">=") {
      return left >= right;
    }

    if (expression.operator === "<=") {
      return left <= right;
    }

    if (expression.operator === "==") {
      return left === right;
    }

    if (expression.operator === "!=") {
      return left !== right;
    }

    if (expression.operator === "&&") {
      return Boolean(left && right);
    }

    if (expression.operator === "||") {
      return Boolean(left || right);
    }
  }

  throw new Error("Could not evaluate that expression.");
}

function evaluateExpressionSource(source) {
  const tokens = EndlessTokenizer.tokenizeExpression(source);

  if (!tokens.length) {
    throw new Error("Type an expression or some spell code.");
  }

  const expression = new ExpressionParser(tokens, 1).parse();
  return evaluateAst(expression, {}, null);
}

const EndlessLab = {
  looksLikeProgram(source) {
    return /^\s*(hero|spell|stash|say|warp|loot|ifso|otherwise|end)\b/m.test(source);
  },

  compile(source) {
    return new EndlessParser(source).parse();
  },

  run(source) {
    if (EndlessLab.looksLikeProgram(source)) {
      const program = EndlessLab.compile(source);
      const report = new EndlessInterpreter(program).run();
      return {
        mode: "script",
        program: report.program,
        output: report.output,
        lastLoot: report.lastLoot,
        result: report.lastLoot
      };
    }

    const result = evaluateExpressionSource(source);
    return {
      mode: "expression",
      output: [],
      lastLoot: result,
      result
    };
  },

  evaluate(source) {
    return evaluateExpressionSource(source);
  },

  formatValue(value) {
    if (typeof value === "string") {
      return `"${value}"`;
    }

    if (typeof value === "boolean") {
      return value ? "ember" : "frost";
    }

    if (value === null || value === undefined) {
      return "nothing";
    }

    return String(value);
  }
};

window.EndlessLab = EndlessLab;
