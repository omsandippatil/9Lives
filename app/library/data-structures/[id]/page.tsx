'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface DataStructureData {
  id: number
  name: string
  theory: string
}

const CodeBlock = ({ children, language = 'javascript' }: { children: string, language?: string }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
  }

  return (
    <div className="relative mb-6 group">
      <div className="bg-gray-900 text-white p-4 overflow-x-auto text-sm font-mono border border-gray-700">
        <pre className="whitespace-pre-wrap">{children}</pre>
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <span className="bg-blue-600 text-white px-2 py-1 text-xs font-mono">
          {language.toUpperCase()}
        </span>
        <button
          onClick={copyToClipboard}
          className="bg-gray-700 text-gray-300 px-2 py-1 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
          title="Copy code"
        >
          📋
        </button>
      </div>
    </div>
  )
}

const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-3xl font-bold mb-6 mt-8 text-gray-900 border-b-2 border-purple-500 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-800 border-l-4 border-purple-400 pl-4">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xl font-medium mb-3 mt-6 text-gray-700">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-lg font-medium mb-3 mt-5 text-gray-700">
      {children}
    </h4>
  ),
  h5: ({ children }: any) => (
    <h5 className="text-base font-semibold mb-2 mt-4 text-gray-800">
      {children}
    </h5>
  ),
  h6: ({ children }: any) => (
    <h6 className="text-base font-medium mb-2 mt-3 text-gray-700">
      {children}
    </h6>
  ),
  p: ({ children }: any) => (
    <p className="mb-4 text-gray-700 leading-relaxed text-base">
      {children}
    </p>
  ),
  ul: ({ children }: any) => (
    <ul className="mb-4 space-y-1 pl-6 list-disc text-gray-700">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="mb-4 space-y-1 pl-6 list-decimal text-gray-700">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-base text-gray-700 leading-relaxed mb-1">
      {children}
    </li>
  ),
  em: ({ children }: any) => (
    <em className="italic text-gray-800 font-medium">{children}</em>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  code: ({ children, className, inline }: any) => {
    if (!inline && (className || String(children).includes('\n') || String(children).length > 50)) {
      return (
        <code className="block bg-gray-900 text-white p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto border border-gray-700">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-gray-100 text-gray-800 px-2 py-1 text-sm font-mono">
        {children}
      </code>
    )
  },
  pre: ({ children }: any) => (
    <div className="relative mb-6">
      <div className="bg-gray-900 text-white p-4 overflow-x-auto text-sm font-mono border border-gray-700">
        {children}
      </div>
      <div className="absolute top-2 right-2">
        <span className="bg-blue-600 text-white px-2 py-1 text-xs font-mono">
          CODE
        </span>
      </div>
    </div>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-purple-400 bg-purple-50 pl-4 py-3 mb-4 italic text-gray-700">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
  ),
  table: ({ children }: any) => (
    <div className="mb-6 overflow-x-auto border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="bg-white divide-y divide-gray-200">
      {children}
    </tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      {children}
    </tr>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100 align-top">
      <div className="whitespace-pre-wrap break-words">
        {children}
      </div>
    </td>
  ),
  br: () => <br className="mb-2" />
}

interface ParsedSection {
  id: string
  title: string
  content: string
  hasCodeBlocks: boolean
}

function processTheoryContent(theory: string): string {
  let processed = theory.replace(/\$#\s*([a-z]*)\s*\n?([\s\S]*?)\n?\s*#\$/g, (match, language, code) => {
    const lang = language.trim() || 'javascript'
    const cleanCode = code.trim()
    return `\`\`\`${lang}\n${cleanCode}\n\`\`\``
  })

  processed = processed.replace(/\$O\(([^)]+)\)\$/g, 'O($1)')
  processed = processed.replace(/\$\Omega\(([^)]+)\)\$/g, 'Ω($1)')
  processed = processed.replace(/\$\Theta\(([^)]+)\)\$/g, 'Θ($1)')

  return processed
}

function parseTheoryContent(theory: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  
  const processedTheory = processTheoryContent(theory)
  
  // Match emoji headings without ### or ## - just emoji followed by **text**
  const emojiHeadingRegex = /^([📚🏗️⚙️📊⚡🛡️🔒🚀📈💻🎯⭐🔄🧩🔍💡🎪🌟🔧🎨🧮💫🔮⚛️🧠🎭🌈🎉💎🔥🎮⚽🎵🎬🎪🎨🔮🌟💡🧩🔬🧪🔬🌍🎯💾⚙️📋🔧🎪🎯]+)\s+\*\*(.+?)\*\*$/gm
  
  const matches = [...processedTheory.matchAll(emojiHeadingRegex)]
  
  if (matches.length === 0) {
    // If no emoji headings found, return empty array
    return sections
  }
  
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const nextMatch = matches[i + 1]
    
    const emoji = match[1]
    const title = match[2].trim()
    
    // Get content between this heading and the next
    const startIndex = match.index! + match[0].length
    const endIndex = nextMatch ? nextMatch.index! : processedTheory.length
    
    let content = processedTheory.substring(startIndex, endIndex).trim()
    
    // Remove separator lines and clean up content
    content = content.replace(/^={3,}$/gm, '').trim()
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive newlines
    
    // Remove the next heading from content if it exists
    if (nextMatch) {
      const nextHeadingIndex = content.lastIndexOf(nextMatch[0])
      if (nextHeadingIndex !== -1) {
        content = content.substring(0, nextHeadingIndex).trim()
      }
    }
    
    if (content) {
      sections.push({
        id: `section-${sections.length}`,
        title: `${emoji} ${title}`,
        content,
        hasCodeBlocks: content.includes('```') || content.includes('$#')
      })
    }
  }
  
  return sections
}

interface SectionCardProps {
  section: ParsedSection
  isExpanded: boolean
  onToggle: () => void
}

function SectionCard({ section, isExpanded, onToggle }: SectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-mono font-medium text-lg text-gray-800 hover:text-black transition-colors">
              {section.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {section.hasCodeBlocks && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 font-mono">
                💻 Code
              </span>
            )}
            <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="pt-4">
            <ReactMarkdown 
              components={MarkdownComponents}
              remarkPlugins={[remarkGfm]}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

function LoadingProgressBar() {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100
        return prev + Math.random() * 15 + 5
      })
    }, 200)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div className="w-64 bg-gray-200 h-2 overflow-hidden">
      <div 
        className="h-full bg-black transition-all duration-300 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}

export default function DataStructuresPage() {
  const params = useParams()
  const router = useRouter()
  const [structureData, setStructureData] = useState<DataStructureData | null>(null)
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('😺')
  const [showAllSections, setShowAllSections] = useState(false)

  useEffect(() => {
    const cats = ['😺', '😸', '😹', '😻', '😽', '🙀', '😿', '😾', '🐱']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2500)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchStructureData = async () => {
      try {
        const { data, error } = await supabase
          .from('data_structure')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          throw error
        }

        setStructureData(data)
        
        if (data.theory) {
          const sections = parseTheoryContent(data.theory)
          setParsedSections(sections)
          
          // Auto-expand the first section
          if (sections.length > 0) {
            const autoExpandSections = new Set<string>()
            autoExpandSections.add(sections[0].id)
            setExpandedSections(autoExpandSections)
          }
        }
      } catch (err) {
        console.error('Error fetching data structure:', err)
        setError('Failed to load data structure content. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchStructureData()
    }
  }, [params.id])

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const toggleAllSections = () => {
    if (showAllSections) {
      setExpandedSections(new Set())
    } else {
      setExpandedSections(new Set(parsedSections.map(s => s.id)))
    }
    setShowAllSections(!showAllSections)
  }

  const handleNext = () => {
    const currentId = parseInt(params.id as string)
    const nextId = currentId + 1
    router.push(`/library/data-structures/${nextId}`)
  }

  const sectionStats = {
    total: parsedSections.length,
    withCode: parsedSections.filter(s => s.hasCodeBlocks).length,
    expanded: expandedSections.size
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🐱</div>
          <p className="text-gray-600 font-mono text-lg mb-6">Loading data structure...</p>
          <LoadingProgressBar />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white shadow-lg border">
          <div className="text-6xl mb-6">😿</div>
          <h2 className="text-2xl font-mono text-gray-800 mb-4">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-black text-white font-mono hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!structureData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🙀</div>
          <p className="text-gray-600 font-mono text-lg">Data structure not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black font-mono">
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🐾</span>
              <h1 className="text-2xl font-light"><a href='/home'>9lives</a></h1>
            </div>
            
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Mode</p>
                <p className="text-sm font-light text-blue-600">Data Structures</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12 bg-white shadow-sm border p-8">
          <div className="text-6xl mb-8 transition-all duration-500">{catAnimation}</div>
          <h2 className="text-4xl font-light mb-6 text-gray-900">
            Data Structure
          </h2>

          <div className="bg-blue-50 border-l-4 border-blue-400 p-6 mb-6">
            <h3 className="text-2xl font-medium text-blue-900 mb-2">Structure:</h3>
            <p className="text-xl text-blue-800 font-bold leading-relaxed">
              {structureData.name}
            </p>
          </div>
          <p className="text-base text-gray-400 font-light">
            Master data structures, understand algorithms 💻
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <div className="flex gap-4 justify-center">
              <button
                onClick={toggleAllSections}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-mono text-sm hover:bg-gray-50 transition-colors"
              >
                {showAllSections ? '📁 Collapse All' : '📂 Expand All'}
              </button>
            </div>
            <div className="flex gap-4 text-sm text-gray-500 justify-center items-center">
              <span>📚 {sectionStats.total} sections</span>
              <span>💻 {sectionStats.withCode} with code</span>
              <span>👁️ {sectionStats.expanded} expanded</span>
            </div>
          </div>
        </div>

        {parsedSections.length > 0 ? (
          <div className="space-y-6 mb-12">
            {parsedSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white shadow-sm border p-8 mb-12">
            <ReactMarkdown 
              components={MarkdownComponents}
              remarkPlugins={[remarkGfm]}
            >
              {processTheoryContent(structureData.theory)}
            </ReactMarkdown>
          </div>
        )}

        <div className="text-center py-8 border-t border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse text-3xl mb-4">💻</div>
          <p className="text-lg text-gray-600 font-light mb-6">
            Ready to explore the next data structure?
          </p>
          <div className="flex justify-center gap-6">
            <button
              onClick={() => router.back()}
              className="py-3 px-8 border border-gray-300 text-gray-700 font-mono text-base hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              className="py-3 px-10 font-mono font-bold text-base transition-all duration-300 shadow-md bg-black text-white hover:bg-gray-800 hover:scale-105 hover:shadow-lg"
            >
              Next Structure →
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}