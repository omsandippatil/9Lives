import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

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

// Custom components for react-markdown
const MarkdownComponents = {
  // Headings
  h1: ({ children }: any) => (
    <h1 className="text-2xl font-bold mb-4 text-gray-900">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-xl font-semibold mb-3 text-gray-800">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-lg font-medium mb-2 text-gray-700">
      {children}
    </h3>
  ),
  
  // Paragraphs
  p: ({ children }: any) => (
    <p className="mb-4 text-sm text-gray-700 leading-relaxed">
      {children}
    </p>
  ),
  
  // Lists
  ul: ({ children }: any) => <ul className="mb-6 space-y-2 pl-4 list-disc">{children}</ul>,
  ol: ({ children }: any) => <ol className="mb-6 space-y-2 pl-4 list-decimal">{children}</ol>,
  li: ({ children }: any) => (
    <li className="text-sm text-gray-700 leading-relaxed">
      {children}
    </li>
  ),
  
  // Code blocks
  code: ({ children, className }: any) => {
    const isBlock = className?.includes('language-')
    
    if (isBlock) {
      return (
        <div className="mb-6 flex justify-center">
          <div className="bg-gray-50 border-2 border-gray-300 px-8 py-6 text-center shadow-sm">
            <code className="font-mono text-sm text-gray-800">{children}</code>
          </div>
        </div>
      )
    }
    
    return (
      <code className="bg-gray-200 text-gray-800 px-1 py-0.5 text-sm font-mono mx-0.5">
        {children}
      </code>
    )
  },
  
  // Pre blocks
  pre: ({ children }: any) => (
    <div className="mb-6 flex justify-center">
      <div className="bg-gray-50 border-2 border-gray-300 px-8 py-6 text-center shadow-sm">
        {children}
      </div>
    </div>
  ),
  
  // Text formatting
  em: ({ children }: any) => (
    <em className="italic text-gray-800">
      {children}
    </em>
  ),
  strong: ({ children }: any) => (
    <strong className="font-semibold text-gray-900">
      {children}
    </strong>
  ),
  
  // Blockquotes
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-200 bg-blue-50 pl-4 py-2 mb-4 italic text-gray-700">
      {children}
    </blockquote>
  ),
  
  // Tables
  table: ({ children }: any) => (
    <div className="overflow-x-auto mb-6">
      <table className="min-w-full border border-gray-200">{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th className="border border-gray-200 bg-gray-50 px-3 py-2 text-left font-medium text-gray-900">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="border border-gray-200 px-3 py-2 text-sm text-gray-700">
      {children}
    </td>
  ),
  
  // Math display blocks (KaTeX will handle these)
  div: ({ children, className }: any) => {
    if (className === 'math math-display') {
      return (
        <div className="mb-6 flex justify-center">
          <div className="bg-blue-50 border-2 border-blue-200 px-8 py-6 text-center shadow-sm">
            {children}
          </div>
        </div>
      )
    }
    return <div className={className}>{children}</div>
  },
  
  // Inline math spans (KaTeX will handle these)
  span: ({ children, className }: any) => {
    if (className === 'math math-inline') {
      return (
        <span className="inline-flex items-baseline bg-gray-100 text-gray-800 px-2 py-1 border mx-1">
          {children}
        </span>
      )
    }
    return <span className={className}>{children}</span>
  }
}

interface SectionCardProps {
  title: string
  emoji: string
  content: string
  fullWidth?: boolean
}

function SectionCard({ title, emoji, content, fullWidth = false }: SectionCardProps) {
  // Clean the content by removing extra quotes
  const cleanContent = content.replace(/^["']|["']$/g, '').trim()
  
  return (
    <div className="bg-white border border-gray-200 hover:border-gray-400 transition-all duration-500 ease-out hover:shadow-lg group">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl group-hover:animate-bounce transition-all duration-300">{emoji}</span>
          <h3 className="font-mono font-medium text-xl group-hover:text-black transition-colors">{title}</h3>
        </div>
        
        <div className="text-gray-800 prose prose-sm max-w-none">
          <ReactMarkdown 
            components={MarkdownComponents}
            remarkPlugins={[remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {cleanContent}
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

  // Clean the topic name
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

        {/* Definition - Full Width */}
        <div className="mb-8">
          <SectionCard
            title="Definition"
            emoji="📖"
            content={theoryData.definition}
            fullWidth={true}
          />
        </div>

        {/* Key Terminology - Full Width */}
        <div className="mb-8">
          <SectionCard
            title="Key Terminology"
            emoji="🏷️"
            content={theoryData.terminology}
            fullWidth={true}
          />
        </div>

        {/* Formulas Section - Full Width */}
        <div className="mb-8">
          <SectionCard
            title="Important Formulas"
            emoji="🧮"
            content={theoryData.formulas}
            fullWidth={true}
          />
        </div>

        {/* Problem Types and Approach */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
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