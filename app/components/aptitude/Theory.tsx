import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'

interface TheoryData {
  id: number
  topic_name: string
  definition: string
  terminology: string
  formulas: string
  types: string
  tricks: string
  approach: string
  common_mistakes: string
}

interface TheoryComponentProps {
  theoryData: TheoryData
  onNext: () => void
}

// KaTeX Formula Component
function FormulaBlock({ formula, title }: { formula: string; title?: string }) {
  const [renderedFormula, setRenderedFormula] = useState<string>('')
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const loadKaTeX = async () => {
      try {
        // Load KaTeX from CDN
        if (!(window as any).katex) {
          const katexCSS = document.createElement('link')
          katexCSS.rel = 'stylesheet'
          katexCSS.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.css'
          document.head.appendChild(katexCSS)

          const katexJS = document.createElement('script')
          katexJS.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.8/katex.min.js'
          katexJS.onload = () => renderFormula()
          document.head.appendChild(katexJS)
        } else {
          renderFormula()
        }
      } catch (err) {
        setError('Failed to load math renderer')
      }
    }

    const renderFormula = () => {
      try {
        const katex = (window as any).katex
        if (katex) {
          // Clean the formula - remove $$ wrapping and trim whitespace
          let cleanFormula = formula
            .replace(/^\$+|\$+$/g, '') // Remove $ wrapping
            .trim()

          const html = katex.renderToString(cleanFormula, {
            displayMode: true,
            throwOnError: false,
            errorColor: '#cc0000',
            strict: false
          })
          setRenderedFormula(html)
        }
      } catch (err) {
        setError(`Math rendering error: ${err}`)
      }
    }

    loadKaTeX()
  }, [formula])

  if (error) {
    return (
      <div className="my-4 p-4 bg-red-50 border-l-4 border-red-400">
        <div className="text-red-700 text-sm">{error}</div>
        <div className="text-gray-600 text-sm mt-2 font-mono">{formula}</div>
      </div>
    )
  }

  return (
    <div className="my-6">
      {title && (
        <div className="text-sm font-medium text-gray-800 mb-3">{title}</div>
      )}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 px-8 py-6 shadow-lg">
        <div 
          className="text-center overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: renderedFormula }}
        />
      </div>
    </div>
  )
}

// Custom components for react-markdown
const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-xl font-bold mb-4 text-gray-900 border-b border-gray-300 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-lg font-semibold mb-4 text-gray-800">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-base font-medium mb-3 text-gray-700 mt-5">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="mb-4 text-sm text-gray-700 leading-relaxed">
      {children}
    </p>
  ),
  ul: ({ children }: any) => <ul className="mb-4 space-y-2 pl-5 list-disc">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-4 space-y-2 pl-5 list-decimal">{children}</ol>,
  li: ({ children }: any) => (
    <li className="text-sm text-gray-700 leading-relaxed">
      {children}
    </li>
  ),
  em: ({ children }: any) => (
    <em className="italic text-gray-800">{children}</em>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  code: ({ children }: any) => (
    <code className="bg-gray-100 text-gray-800 px-2 py-1 text-sm font-mono mx-1">
      {children}
    </code>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-3 mb-4 italic text-gray-700">
      {children}
    </blockquote>
  )
}

interface SectionCardProps {
  title: string
  emoji: string
  content: string
  fullWidth?: boolean
}

function SectionCard({ title, emoji, content, fullWidth = false }: SectionCardProps) {
  // Clean content by removing surrounding quotes and trimming
  const cleanContent = content.replace(/^["']|["']$/g, '').trim()
  
  // Special handling for formulas section
  if (title === "Important Formulas") {
    // Parse formulas based on the expected format: title followed by formula
    const lines = cleanContent.split('\n').filter(line => line.trim())
    const formulaBlocks = []
    
    let i = 0
    while (i < lines.length) {
      const currentLine = lines[i].trim()
      
      // Check if this line contains a formula (has $$ or LaTeX syntax)
      if (currentLine.includes('$$')) {
        // Extract formula from $$ wrapping
        formulaBlocks.push({
          title: i > 0 ? lines[i-1].trim() : null,
          formula: currentLine
        })
      } else if (i + 1 < lines.length && lines[i + 1].trim().includes('$$')) {
        // Current line is title, next line is formula
        formulaBlocks.push({
          title: currentLine,
          formula: lines[i + 1].trim()
        })
        i++ // Skip the formula line in next iteration
      } else if (currentLine.includes('\\') || 
                 currentLine.includes('frac') || 
                 currentLine.includes('sum') || 
                 currentLine.includes('sqrt') ||
                 /[a-zA-Z]\s*=.*/.test(currentLine)) {
        // This line looks like a formula without $$ wrapping
        formulaBlocks.push({
          title: i > 0 ? lines[i-1].trim() : null,
          formula: currentLine
        })
      }
      i++
    }
    
    return (
      <div className="bg-white border border-gray-200 hover:border-gray-400 transition-all duration-500 ease-out hover:shadow-lg group">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-2xl group-hover:animate-bounce transition-all duration-300">{emoji}</span>
            <h3 className="font-mono font-medium text-lg group-hover:text-black transition-colors">{title}</h3>
          </div>
          
          <div className="space-y-6">
            {formulaBlocks.map((block, index) => (
              <FormulaBlock 
                key={index} 
                formula={block.formula}
                title={block.title || undefined}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  // Special handling for terminology
  let processedContent = cleanContent
  if (title === "Key Terminology") {
    processedContent = cleanContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        if (line.includes(' : ')) {
          const [term, definition] = line.split(' : ', 2)
          return `**${term.trim()}**: ${definition.trim()}`
        }
        return line
      })
      .join('\n\n')
  }
  
  // Special handling for bullet point lists (types, tricks, approach, common_mistakes)
  if (title === "Types of Problems" || title === "Tricks & Tips" || 
      title === "Problem-Solving Approach" || title === "Common Mistakes") {
    // Convert "- item" format to proper markdown
    processedContent = cleanContent.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const trimmed = line.trim()
        if (trimmed.startsWith('- ')) {
          return trimmed
        } else if (trimmed && !trimmed.startsWith('-')) {
          return `- ${trimmed}`
        }
        return trimmed
      })
      .join('\n')
  }
  
  return (
    <div className="bg-white border border-gray-200 hover:border-gray-400 transition-all duration-500 ease-out hover:shadow-lg group">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <span className="text-2xl group-hover:animate-bounce transition-all duration-300">{emoji}</span>
          <h3 className="font-mono font-medium text-lg group-hover:text-black transition-colors">{title}</h3>
        </div>
        
        <div className="text-gray-800 prose prose-sm max-w-none prose-headings:text-gray-800 prose-strong:text-gray-900">
          <ReactMarkdown components={MarkdownComponents}>
            {processedContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  )
}

export default function TheoryComponent({ theoryData, onNext }: TheoryComponentProps) {
  const [catAnimation, setCatAnimation] = useState('😺')
  
  useEffect(() => {
    const cats = ['😺', '😸', '😹', '😻', '😽', '🙀', '😿', '😾', '🐱', '🐈', '🐈‍⬛']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2500)
    
    return () => clearInterval(interval)
  }, [])

  // Clean topic name from any surrounding quotes
  const cleanTopicName = theoryData.topic_name.replace(/^["']|["']$/g, '').trim()

  return (
    <div className="min-h-screen bg-gray-50 text-black font-mono">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Theory</p>
              <p className="text-sm font-light">Learning Mode</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Topic Header */}
        <div className="text-center mb-10">
          <div className="text-6xl mb-6 transition-all duration-500">{catAnimation}</div>
          <h2 className="text-4xl font-light mb-4 text-gray-900">
            {cleanTopicName}
          </h2>
          <p className="text-xl text-gray-600 font-light mb-2">
            Master the fundamentals, one paw at a time
          </p>
          <p className="text-base text-gray-400 font-light">
            Knowledge is purr-power 🐾
          </p>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* Definition */}
          <SectionCard
            title="Definition"
            emoji="📖"
            content={theoryData.definition}
            fullWidth={true}
          />

          {/* Key Terminology */}
          <SectionCard
            title="Key Terminology"
            emoji="🏷️"
            content={theoryData.terminology}
            fullWidth={true}
          />

          {/* Important Formulas */}
          <SectionCard
            title="Important Formulas"
            emoji="🧮"
            content={theoryData.formulas}
            fullWidth={true}
          />
        </div>

        {/* Two Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8 mb-8">
          <SectionCard
            title="Types of Problems"
            emoji="🎯"
            content={theoryData.types}
          />
          
          <SectionCard
            title="Problem-Solving Approach"
            emoji="🧠"
            content={theoryData.approach}
          />
        </div>

        {/* Tips and Mistakes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <SectionCard
            title="Tricks & Tips"
            emoji="💡"
            content={theoryData.tricks}
          />
          
          <SectionCard
            title="Common Mistakes"
            emoji="⚠️"
            content={theoryData.common_mistakes}
          />
        </div>

        {/* Next Button */}
        <div className="text-center py-6 border-t border-gray-200 bg-white">
          <div className="animate-pulse text-xl mb-3">🐱‍🏫</div>
          <p className="text-base text-gray-600 font-light mb-4">
            Ready to put theory into practice?
          </p>
          <button
            onClick={onNext}
            className="py-3 px-8 bg-black text-white font-mono text-base hover:bg-gray-800 transition-all duration-300 hover:scale-105 hover:shadow-lg"
          >
            Next: Practice Questions →
          </button>
        </div>
      </main>
    </div>
  )
}