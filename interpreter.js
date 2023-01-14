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
