function parseJSON(raw) {
  if (!raw || !String(raw).trim()) {
    throw new Error('Empty AI response. Try again with a smaller PDF or a different Gemini model.');
  }

  let source = String(raw)
    .trim()
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/```\s*$/u, '')
    .trim();

  try {
    return JSON.parse(source);
  } catch (_) {
    // Continue into repair flow.
  }

  const start = source.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON found in AI response. Try re-running.');
  }

  source = source.slice(start);

  function repair(truncated) {
    const stack = [];
    let inString = false;
    let escaped = false;

    for (let index = 0; index < truncated.length; index += 1) {
      const char = truncated[index];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if ((char === '}' || char === ']') && stack.length > 0) {
        stack.pop();
      }
    }

    let repaired = truncated;
    if (inString) {
      repaired += '"';
    }
    repaired = repaired.replace(/,\s*$/u, '');
    return repaired + stack.reverse().join('');
  }

  try {
    return JSON.parse(repair(source));
  } catch (_) {
    throw new Error(
      `AI response was truncated. Try Gemini 2.0 Flash again or split the PDF into smaller parts. Preview: ${source.substring(0, 250)}`
    );
  }
}

module.exports = parseJSON;
