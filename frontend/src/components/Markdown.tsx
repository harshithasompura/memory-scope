import ReactMarkdown from 'react-markdown'

// Renders answer text as markdown. Tailwind v4 has no typography plugin here,
// so list/heading/code styling is applied via arbitrary-variant utilities.
export function Markdown({ children, className = '' }: { children: string; className?: string }) {
  return (
    <div
      className={`space-y-2 [&_a]:text-accent-deep [&_a]:underline [&_code]:rounded [&_code]:bg-ink/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_h1]:font-mono [&_h1]:text-base [&_h1]:font-semibold [&_h2]:font-mono [&_h2]:text-sm [&_h2]:font-semibold [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 ${className}`}
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}
