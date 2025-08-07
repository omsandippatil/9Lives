import { useState, useEffect } from 'react'

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

// Mathematical formula renderer that creates actual React elements
const MathRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  const parseMath = (text: string): (string | React.ReactNode)[] => {
    const result: (string | React.ReactNode)[] = []
    let remaining = text
    let keyCounter = 0

    // Process fractions first (most complex)
    const fractionRegex = /\(([^()]*(?:\([^)]*\)[^()]*)*)\)\s*\/\s*\(([^()]*(?:\([^)]*\)[^()]*)*)\)|([a-zA-Z0-9\+\-\*\s]+)\s*\/\s*([a-zA-Z0-9\+\-\*\s]+)/g
    let lastIndex = 0
    let match

    while ((match = fractionRegex.exec(remaining)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        const beforeText = remaining.slice(lastIndex, match.index)
        result.push(...parseSimpleMath(beforeText))
      }

      // Create fraction element
      const numerator = match[1] || match[3] || ''
      const denominator = match[2] || match[4] || ''
      
      result.push(
        <span key={`fraction-${keyCounter++}`} className="inline-block text-center align-middle mx-1 relative">
          <span className="block border-b-2 border-gray-700 px-1.5 py-0.5 text-sm min-w-5 leading-tight">
            {parseSimpleMath(numerator.trim())}
          </span>
          <span className="block px-1.5 py-0.5 text-sm min-w-5 leading-tight">
            {parseSimpleMath(denominator.trim())}
          </span>
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < remaining.length) {
      result.push(...parseSimpleMath(remaining.slice(lastIndex)))
    }

    return result
  }

  const parseSimpleMath = (text: string): (string | React.ReactNode)[] => {
    if (!text) return []
    
    let result: (string | React.ReactNode)[] = []
    let remaining = text
    let keyCounter = 0

    // Square roots
    remaining = remaining.replace(/sqrt\s*\(\s*([^)]+)\s*\)/g, (match, content) => {
      const id = `SQRT_${keyCounter++}`
      result.push(
        <span key={id} className="relative inline-block mx-0.5 text-lg align-middle">
          √<span className="border-t-2 border-gray-700 pt-0.5 ml-0.5 pl-0.5 pr-0.5 min-w-4 inline-block">
            {content}
          </span>
        </span>
      )
      return `__${id}__`
    })

    // Handle exponents
    remaining = remaining.replace(/\^(\{[^}]+\}|\([^)]+\)|[a-zA-Z0-9\+\-]+)/g, (match, exp) => {
      const id = `SUP_${keyCounter++}`
      const cleanExp = exp.replace(/[\{\}()]/g, '')
      result.push(<sup key={id} className="text-xs align-super leading-none mx-0.5">{cleanExp}</sup>)
      return `__${id}__`
    })

    // Handle subscripts
    remaining = remaining.replace(/_(\{[^}]+\}|\([^)]+\)|[a-zA-Z0-9\+\-]+)/g, (match, sub) => {
      const id = `SUB_${keyCounter++}`
      const cleanSub = sub.replace(/[\{\}()]/g, '')
      result.push(<sub key={id} className="text-xs align-sub leading-none mx-0.5">{cleanSub}</sub>)
      return `__${id}__`
    })

    // Greek letters and symbols (expanded list)
    const symbols = {
      // Greek lowercase
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
      '\\theta': 'θ', '\\vartheta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
      '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
      '\\pi': 'π', '\\varpi': 'π', '\\rho': 'ρ', '\\varrho': 'ρ',
      '\\sigma': 'σ', '\\varsigma': 'ς', '\\tau': 'τ', '\\upsilon': 'υ',
      '\\phi': 'φ', '\\varphi': 'φ', '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
      
      // Greek uppercase
      '\\Gamma': 'Γ', '\\Delta': 'Δ', '\\Theta': 'Θ', '\\Lambda': 'Λ',
      '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Sigma': 'Σ', '\\Upsilon': 'Υ',
      '\\Phi': 'Φ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
      
      // Math operators
      '\\pm': '±', '\\mp': '∓', '\\times': '×', '\\div': '÷',
      '\\cdot': '·', '\\ast': '∗', '\\star': '⋆', '\\dagger': '†',
      '\\ddagger': '‡', '\\amalg': '∐', '\\cap': '∩', '\\cup': '∪',
      '\\uplus': '⊎', '\\sqcap': '⊓', '\\sqcup': '⊔', '\\vee': '∨',
      '\\wedge': '∧', '\\oplus': '⊕', '\\ominus': '⊖', '\\otimes': '⊗',
      '\\circ': '∘', '\\bullet': '∙',
      
      // Relations
      '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
      '\\neq': '≠', '\\ne': '≠', '\\sim': '∼', '\\not\\sim': '≁',
      '\\simeq': '≃', '\\approx': '≈', '\\cong': '≅', '\\equiv': '≡',
      '\\prec': '≺', '\\succ': '≻', '\\preceq': '≼', '\\succeq': '≽',
      '\\subset': '⊂', '\\supset': '⊃', '\\subseteq': '⊆', '\\supseteq': '⊇',
      '\\in': '∈', '\\ni': '∋', '\\notin': '∉', '\\propto': '∝',
      
      // Arrows
      '\\leftarrow': '←', '\\gets': '←', '\\rightarrow': '→', '\\to': '→',
      '\\leftrightarrow': '↔', '\\Leftarrow': '⇐', '\\Rightarrow': '⇒',
      '\\Leftrightarrow': '⇔', '\\mapsto': '↦', '\\hookleftarrow': '↩',
      '\\hookrightarrow': '↪', '\\leftharpoonup': '↼', '\\rightharpoonup': '⇀',
      '\\leftharpoondown': '↽', '\\rightharpoondown': '⇁', '\\rightleftharpoons': '⇌',
      
      // Other symbols
      '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇', '\\emptyset': '∅',
      '\\varnothing': '∅', '\\wp': '℘', '\\Re': 'ℜ', '\\Im': 'ℑ',
      '\\mho': '℧', '\\prime': '′', '\\ldots': '…', '\\cdots': '⋯',
      '\\vdots': '⋮', '\\ddots': '⋱', '\\forall': '∀', '\\exists': '∃',
      '\\nexists': '∄', '\\neg': '¬', '\\lnot': '¬', '\\flat': '♭',
      '\\natural': '♮', '\\sharp': '♯', '\\clubsuit': '♣', '\\diamondsuit': '♢',
      '\\heartsuit': '♡', '\\spadesuit': '♠',
      
      // Functions
      '\\sin': 'sin', '\\cos': 'cos', '\\tan': 'tan', '\\cot': 'cot',
      '\\sec': 'sec', '\\csc': 'csc', '\\arcsin': 'arcsin', '\\arccos': 'arccos',
      '\\arctan': 'arctan', '\\sinh': 'sinh', '\\cosh': 'cosh', '\\tanh': 'tanh',
      '\\log': 'log', '\\ln': 'ln', '\\lg': 'lg', '\\exp': 'exp',
      '\\max': 'max', '\\min': 'min', '\\sup': 'sup', '\\inf': 'inf',
      '\\lim': 'lim', '\\limsup': 'lim sup', '\\liminf': 'lim inf',
      '\\dim': 'dim', '\\ker': 'ker', '\\hom': 'hom', '\\arg': 'arg',
      '\\deg': 'deg', '\\det': 'det', '\\gcd': 'gcd', '\\lcm': 'lcm'
    }

    for (const [latex, symbol] of Object.entries(symbols)) {
      remaining = remaining.replace(new RegExp(latex.replace('\\', '\\\\'), 'g'), symbol)
    }

    // Split by placeholders and rebuild
    const parts = remaining.split(/(__[A-Z_0-9]+__)/g)
    const finalResult: (string | React.ReactNode)[] = []

    parts.forEach(part => {
      if (part.startsWith('__') && part.endsWith('__')) {
        // Find corresponding element
        const element = result.find(el => 
          el && typeof el === 'object' && 'key' in el && el.key === part.slice(2, -2)
        )
        if (element) {
          finalResult.push(element)
        }
      } else if (part) {
        finalResult.push(part)
      }
    })

    return finalResult.length > 0 ? finalResult : [remaining]
  }

  return (
    <span className="font-serif text-base leading-relaxed inline-block align-middle">
      {parseMath(content)}
    </span>
  )
}

// Enhanced markdown renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactElement[] = []
  let currentList: React.ReactElement[] = []
  let listType: 'bullet' | 'number' | null = null

  const flushList = () => {
    if (currentList.length > 0) {
      if (listType === 'number') {
        elements.push(
          <ol key={`list-${elements.length}`} className="mb-6 space-y-3 pl-4">
            {currentList}
          </ol>
        )
      } else if (listType === 'bullet') {
        elements.push(
          <ul key={`list-${elements.length}`} className="mb-6 space-y-3 pl-4">
            {currentList}
          </ul>
        )
      }
      currentList = []
      listType = null
    }
  }

  const renderInlineContent = (text: string) => {
    // Process text through multiple passes for different math formats
    let processedText = text

    // First pass: Handle LaTeX-style inline math $formula$
    const inlineMathRegex = /\$([^$]+)\$/g
    const inlineMathParts = processedText.split(inlineMathRegex)
    
    return inlineMathParts.map((part, i) => {
      if (i % 2 === 1) {
        // This is an inline LaTeX formula
        return (
          <span 
            key={`inline-${i}`} 
            className="inline-block bg-blue-50 text-gray-800 px-2 py-1 border mx-1 font-serif text-base"
          >
            <MathRenderer content={part} />
          </span>
        )
      } else {
        // Process this part for other formats
        return processOtherFormats(part, i)
      }
    })
  }

  const processOtherFormats = (text: string, baseIndex: number) => {
    // Handle backtick formulas and other markdown
    const codeRegex = /`([^`]+)`/g
    const parts = text.split(codeRegex)
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        // This is a backtick formula/code block
        return (
          <span 
            key={`${baseIndex}-code-${i}`} 
            className="inline-block bg-gray-100 text-gray-800 px-3 py-2 border mx-1 font-serif text-base"
          >
            <MathRenderer content={part} />
          </span>
        )
      } else {
        // Handle other markdown formatting
        return processTextFormatting(part, `${baseIndex}-${i}`)
      }
    })
  }

  const processTextFormatting = (text: string, keyPrefix: string) => {
    // Handle bold text **text**
    const boldRegex = /\*\*(.*?)\*\*/g
    const boldParts = text.split(boldRegex)
    
    return boldParts.map((segment, j) => {
      if (j % 2 === 1) {
        return <strong key={`${keyPrefix}-bold-${j}`} className="font-semibold text-gray-900">{segment}</strong>
      } else {
        // Handle italic text *text*
        const italicRegex = /\*([^*]+)\*/g
        const italicParts = segment.split(italicRegex)
        
        return italicParts.map((italicSegment, k) => {
          if (k % 2 === 1) {
            return <em key={`${keyPrefix}-italic-${j}-${k}`} className="italic text-gray-800">{italicSegment}</em>
          } else {
            // Handle inline code without math
            const inlineCodeRegex = /(?<!`)`([^`\$]+)`(?!`)/g
            const codeParts = italicSegment.split(inlineCodeRegex)
            
            return codeParts.map((codePart, l) => {
              if (l % 2 === 1) {
                return (
                  <code key={`${keyPrefix}-inlinecode-${j}-${k}-${l}`} className="bg-gray-200 text-gray-800 px-1 py-0.5 text-sm font-mono">
                    {codePart}
                  </code>
                )
              }
              return codePart
            })
          }
        })
      }
    })
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      flushList()
      elements.push(<div key={index} className="mb-4" />)
      return
    }

    // Handle numbered lists
    const numberedMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/)
    if (numberedMatch) {
      if (listType !== 'number') {
        flushList()
        listType = 'number'
      }
      const [, , content] = numberedMatch
      currentList.push(
        <li key={index} className="text-sm text-gray-700 leading-relaxed">
          {renderInlineContent(content)}
        </li>
      )
      return
    }

    // Handle bullet points
    const bulletMatch = trimmedLine.match(/^[-*]\s*(.+)$/)
    if (bulletMatch) {
      const content = bulletMatch[1]
      
      // Check if it's a standalone formula line (backtick or LaTeX style)
      if (content.startsWith(':') || content.match(/^\$.*\$/)) {
        flushList()
        let formula = content
        if (content.startsWith(':')) {
          formula = content.substring(1).trim()
        } else if (content.match(/^\$.*\$/)) {
          formula = content.slice(1, -1) // Remove $ delimiters
        }
        elements.push(
          <div key={index} className="mb-6 flex justify-center">
            <div className="bg-gray-50 border-2 border-gray-300 px-8 py-6 text-center font-serif text-lg shadow-sm">
              <MathRenderer content={formula} />
            </div>
          </div>
        )
        return
      }
      
      // Regular bullet point
      if (listType !== 'bullet') {
        flushList()
        listType = 'bullet'
      }
      currentList.push(
        <li key={index} className="text-sm text-gray-700 leading-relaxed list-disc ml-4">
          {renderInlineContent(content)}
        </li>
      )
      return
    }

    // Check for standalone display formulas (LaTeX style $formula$ or block formulas)
    const displayMathMatch = trimmedLine.match(/^\$\$(.+)\$\$/)
    if (displayMathMatch) {
      flushList()
      const formula = displayMathMatch[1]
      elements.push(
        <div key={index} className="mb-6 flex justify-center">
          <div className="bg-blue-50 border-2 border-blue-200 px-8 py-6 text-center font-serif text-xl shadow-sm">
            <MathRenderer content={formula} />
          </div>
        </div>
      )
      return
    }

    // Regular paragraph
    flushList()
    elements.push(
      <p key={index} className="mb-4 text-sm text-gray-700 leading-relaxed">
        {renderInlineContent(trimmedLine)}
      </p>
    )
  })

  flushList()
  return <>{elements}</>
}

interface SectionCardProps {
  title: string
  emoji: string
  content: string
  fullWidth?: boolean
}

function SectionCard({ title, emoji, content, fullWidth = false }: SectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 hover:border-gray-400 transition-all duration-500 ease-out hover:shadow-lg group">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl group-hover:animate-bounce transition-all duration-300">{emoji}</span>
          <h3 className="font-mono font-medium text-xl group-hover:text-black transition-colors">{title}</h3>
        </div>
        
        <div className="text-gray-800">
          <MarkdownRenderer content={content.replace(/['"]/g, '')} />
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
            {theoryData.topic_name.replace(/['"]/g, '')}
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