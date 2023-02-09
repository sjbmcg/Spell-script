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
