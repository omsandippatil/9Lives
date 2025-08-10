'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import TheoryComponent from '@/app/components/aptitude/Theory'
import QuestionComponent from '@/app/components/aptitude/Question'

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

interface QuestionData {
  id: number
  question: string
  formula_or_logic: string
  options: string[]
  explanation: string
  tags: string[]
}

// Cat-themed loading component
const CatLoadingScreen = ({ message = "loading..." }: { message?: string }) => {
  const [dots, setDots] = useState('')
  const [catFrame, setCatFrame] = useState(0)
  
  const catFrames = ['🐱', '😺', '😸', '😻']
  
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)
    
    const catInterval = setInterval(() => {
      setCatFrame(prev => (prev + 1) % catFrames.length)
    }, 800)
    
    return () => {
      clearInterval(dotsInterval)
      clearInterval(catInterval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="text-center font-mono">
        <div className="text-6xl mb-6 animate-pulse">
          {catFrames[catFrame]}
        </div>
        <div className="text-xl tracking-wider">
          <span className="text-gray-700">{'>'}</span> {message}
          <span className="inline-block w-8 text-left">{dots}</span>
        </div>
        <div className="mt-4 text-sm text-gray-500 tracking-widest">
          [ initializing cat protocols ]
        </div>
      </div>
    </div>
  )
}

// Cat-themed error component
const CatErrorScreen = ({ error, onRetry }: { error: string; onRetry: () => void }) => {
  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center">
      <div className="text-center font-mono">
        <div className="text-6xl mb-6">
          🙀
        </div>
        <div className="text-xl tracking-wider mb-4">
          <span className="text-red-600">{'>'}</span> error: cat.exe stopped working
        </div>
        <div className="text-sm text-gray-600 mb-6 max-w-md">
          {error}
        </div>
        <button 
          onClick={onRetry}
          className="px-6 py-2 border border-black text-black bg-transparent hover:bg-black hover:text-white transition-colors font-mono tracking-wider"
        >
          [ retry ]
        </button>
      </div>
    </div>
  )
}

export default function AptitudePage() {
  const params = useParams()
  const id = parseInt(params.id as string)
  
  const [theoryData, setTheoryData] = useState<TheoryData | null>(null)
  const [questionData, setQuestionData] = useState<QuestionData | null>(null)
  const [showTheory, setShowTheory] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if this ID should show theory first (1, 51, 101, etc.)
  const shouldShowTheory = (id: number) => {
    return id === 1 || (id > 1 && (id - 1) % 50 === 0)
  }

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const needsTheory = shouldShowTheory(id)
      
      if (needsTheory) {
        // Calculate topic_id for theory API
        const topicId = Math.floor((id - 1) / 50) + 1
        
        // Fetch theory data
        const theoryResponse = await fetch(`/api/get/aptitude/theory?topic_id=${topicId}`)
        if (!theoryResponse.ok) throw new Error('Failed to fetch theory data')
        const theoryResult = await theoryResponse.json()
        
        if (theoryResult.success && theoryResult.data.length > 0) {
          setTheoryData(theoryResult.data[0])
          setShowTheory(true)
        }
      }
      
      // Fetch question data
      const questionResponse = await fetch(`/api/get/aptitude/question?question_id=${id}`)
      if (!questionResponse.ok) throw new Error('Failed to fetch question data')
      const questionResult = await questionResponse.json()
      
      if (questionResult.success && questionResult.data.length > 0) {
        setQuestionData(questionResult.data[0])
        if (!needsTheory) {
          setShowTheory(false)
        }
      } else {
        throw new Error('Question not found')
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchData()
    }
  }, [id])

  const handleNextFromTheory = () => {
    setShowTheory(false)
  }

  if (loading) {
    return <CatLoadingScreen message="fetching cat wisdom" />
  }

  if (error) {
    return <CatErrorScreen error={error} onRetry={fetchData} />
  }

  return (
    <div className="min-h-screen">
      {showTheory && theoryData ? (
        <TheoryComponent 
          theoryData={theoryData} 
          onNext={handleNextFromTheory}
        />
      ) : questionData ? (
        <QuestionComponent 
          questionData={questionData}
          questionId={id}
        />
      ) : (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center font-mono">
            <div className="text-4xl mb-4">😿</div>
            <div className="text-lg tracking-wider">
              <span className="text-gray-400">{'>'}</span> no cat data found
            </div>
          </div>
        </div>
      )}
    </div>
  )
}