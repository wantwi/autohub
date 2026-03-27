/**
 * Split PostgreSQL script on statement-ending semicolons, ignoring `;` inside dollar-quoted strings ($$...$$, $tag$...$tag$).
 * @param {string} sql
 * @returns {string[]}
 */
export function splitPgStatements(sql) {
  const statements = [];
  let buf = '';
  let i = 0;
  /** @type {string | null} closing delimiter to find */
  let dollarClose = null;

  const readDollarQuoteOpen = (pos) => {
    if (sql[pos] !== '$') return null;
    const m = sql.slice(pos).match(/^\$([^$]*)\$/);
    return m ? m[0] : null;
  };

  const commentOnly = (s) => {
    const lines = s.split(/\r?\n/);
    return lines.every((line) => {
      const t = line.trim();
      return t.length === 0 || t.startsWith('--');
    });
  };

  while (i < sql.length) {
    if (dollarClose) {
      if (sql.slice(i, i + dollarClose.length) === dollarClose) {
        buf += dollarClose;
        i += dollarClose.length;
        dollarClose = null;
        continue;
      }
      buf += sql[i];
      i++;
      continue;
    }

    const open = readDollarQuoteOpen(i);
    if (open) {
      buf += open;
      i += open.length;
      dollarClose = open;
      continue;
    }

    if (sql[i] === ';') {
      const stmt = buf.trim();
      buf = '';
      i++;
      while (i < sql.length && /\s/.test(sql[i])) i++;
      if (stmt.length > 0 && !commentOnly(stmt)) statements.push(stmt);
      continue;
    }

    buf += sql[i];
    i++;
  }

  const tail = buf.trim();
  if (tail.length > 0 && !commentOnly(tail)) statements.push(tail);
  return statements;
}
