import { diffLines } from 'diff'

export default function DiffView({ original, current }) {
  if (original === current) {
    return <div style={{ textAlign: 'center', color: '#64748b', padding: 40 }}>内容未修改</div>
  }

  const parts = diffLines(original, current)

  return (
    <div className="diff-container">
      {parts.map((part, i) => {
        if (!part.added && !part.removed) {
          // Show context lines (first and last 2 lines of unchanged blocks)
          const lines = part.value.split('\n')
          if (lines.length > 6) {
            const head = lines.slice(0, 2).join('\n')
            const tail = lines.slice(-3).join('\n')
            return (
              <div key={i}>
                <div className="diff-line diff-context">{head}</div>
                <div className="diff-line" style={{ textAlign: 'center', color: '#94a3b8', padding: '4px 0', fontSize: 12 }}>
                  ... 省略 {lines.length - 4} 行未修改内容 ...
                </div>
                <div className="diff-line diff-context">{tail}</div>
              </div>
            )
          }
          return <div key={i} className="diff-line diff-context">{part.value}</div>
        }
        return (
          <div
            key={i}
            className={`diff-line ${part.added ? 'diff-added' : 'diff-removed'}`}
          >
            {part.added ? '+ ' : '- '}{part.value}
          </div>
        )
      })}
    </div>
  )
}
