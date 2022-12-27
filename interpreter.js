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
