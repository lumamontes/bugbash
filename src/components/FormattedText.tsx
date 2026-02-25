interface Props {
  text: string;
  className?: string;
}

/**
 * Renders plain text with basic formatting:
 * - Preserves line breaks
 * - Lines starting with •, -, * become styled bullet items
 * - Lines ending with : or fully UPPERCASE are rendered as labels
 */
export default function FormattedText({ text, className = '' }: Props) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let bulletBuffer: string[] = [];
  let key = 0;

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="space-y-1 my-1.5">
        {bulletBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary-400 mt-px flex-shrink-0">&#8226;</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
    bulletBuffer = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushBullets();
      continue;
    }

    // Bullet line: starts with •, -, or *
    const bulletMatch = line.match(/^[•\-\*]\s*(.+)/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1]);
      continue;
    }

    // Flush any pending bullets before non-bullet content
    flushBullets();

    // Label line: ends with : or is fully uppercase (min 3 chars)
    const isLabel = line.endsWith(':') || (line.length >= 3 && line === line.toUpperCase() && /[A-ZÀ-Ú]/.test(line));
    if (isLabel) {
      elements.push(
        <p key={key++} className="font-semibold text-text-primary mt-2 first:mt-0">
          {line}
        </p>
      );
      continue;
    }

    // Regular line
    elements.push(
      <p key={key++} className="my-0.5">{line}</p>
    );
  }

  flushBullets();

  return <div className={className}>{elements}</div>;
}
