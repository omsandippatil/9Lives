'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import React from 'react';

interface SqlSyntax {
  id: number;
  name: string;
  theory: string;
}

export default function SqlSyntaxPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [syntaxData, setSyntaxData] = useState<SqlSyntax | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSyntaxData = async () => {
      try {
        setLoading(true);
        
        // Replace with your actual Supabase client setup
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data, error } = await supabase
          .from('sql_syntax')
          .select('*')
          .eq('id', parseInt(id))
          .single();

        if (error) {
          setError('Failed to fetch SQL syntax data');
          return;
        }

        setSyntaxData(data);
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSyntaxData();
    }
  }, [id]);

  const handlePrevious = () => {
    const currentId = parseInt(id);
    if (currentId > 1) {
      router.push(`/library/sql/${currentId - 1}`);
    }
  };

  const handleNext = () => {
    const currentId = parseInt(id);
    router.push(`/library/sql/${currentId + 1}`);
  };

  // Function to render markdown-like content with proper formatting
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactElement[] = [];
    let currentElement = '';
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle headers with emoji markers (🏗️, 🔧, 📚, etc.)
      if (line.match(/^####?\s*[🏗️🔧📚🎯🔄📊🔍⚡🔗🛠️🔐🎨🔧📝]/)) {
        if (currentElement) {
          elements.push(
            <div key={elements.length} className="mb-6 leading-relaxed text-gray-700">
              {renderTextContent(currentElement.trim())}
            </div>
          );
          currentElement = '';
        }
        
        const headerText = line.replace(/^####?\s*/, '').trim();
        if (headerText) {
          elements.push(
            <h3 key={elements.length} className="text-xl font-bold mb-4 mt-8 text-black border-l-4 border-black pl-4 bg-gray-100 py-2">
              {headerText}
            </h3>
          );
        }
      }
      // Handle ## headers
      else if (line.startsWith('## ')) {
        if (currentElement) {
          elements.push(
            <div key={elements.length} className="mb-6 leading-relaxed text-gray-700">
              {renderTextContent(currentElement.trim())}
            </div>
          );
          currentElement = '';
        }
        elements.push(
          <h2 key={elements.length} className="text-2xl font-bold mb-6 mt-10 text-black border-b-2 border-gray-300 pb-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      // Handle ### headers
      else if (line.startsWith('### ')) {
        if (currentElement) {
          elements.push(
            <div key={elements.length} className="mb-6 leading-relaxed text-gray-700">
              {renderTextContent(currentElement.trim())}
            </div>
          );
          currentElement = '';
        }
        elements.push(
          <h3 key={elements.length} className="text-xl font-bold mb-4 mt-8 text-black border-l-4 border-black pl-4">
            {line.replace('### ', '')}
          </h3>
        );
      }
      // Handle table start
      else if (line.trim().startsWith('|') && line.trim().endsWith('|') && !inTable) {
        if (currentElement) {
          elements.push(
            <div key={elements.length} className="mb-6 leading-relaxed text-gray-700">
              {renderTextContent(currentElement.trim())}
            </div>
          );
          currentElement = '';
        }
        inTable = true;
        tableHeaders = line.trim().slice(1, -1).split('|').map(h => h.trim());
        tableRows = [];
      }
      // Handle table separator
      else if (line.trim().startsWith('|') && line.includes('---') && inTable) {
        continue;
      }
      // Handle table rows
      else if (line.trim().startsWith('|') && line.trim().endsWith('|') && inTable) {
        const row = line.trim().slice(1, -1).split('|').map(cell => cell.trim());
        tableRows.push(row);
      }
      // Handle end of table or other content
      else {
        if (inTable) {
          elements.push(renderTable(tableHeaders, tableRows, elements.length));
          inTable = false;
          tableHeaders = [];
          tableRows = [];
        }
        
        if (line.trim()) {
          currentElement += line + '\n';
        } else if (currentElement.trim()) {
          elements.push(
            <div key={elements.length} className="mb-6 leading-relaxed text-gray-700">
              {renderTextContent(currentElement.trim())}
            </div>
          );
          currentElement = '';
        }
      }
    }

    // Handle remaining content
    if (currentElement.trim()) {
      elements.push(
        <div key={elements.length} className="mb-6 leading-relaxed text-gray-700">
          {renderTextContent(currentElement.trim())}
        </div>
      );
    }

    // Handle remaining table
    if (inTable && tableRows.length > 0) {
      elements.push(renderTable(tableHeaders, tableRows, elements.length));
    }

    return elements;
  };

  const renderTable = (headers: string[], rows: string[][], key: number) => (
    <div key={key} className="mb-8 overflow-x-auto border border-gray-300 shadow-lg rounded-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {headers.map((header, idx) => (
              <th
                key={idx}
                className="border-b border-gray-300 px-6 py-4 text-left font-semibold text-black text-sm uppercase tracking-wide"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr 
              key={rowIdx} 
              className={`hover:bg-gray-50 transition-colors ${
                rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
              }`}
            >
              {row.map((cell, cellIdx) => (
                <td
                  key={cellIdx}
                  className="border-b border-gray-200 px-6 py-4 align-top"
                >
                  {cellIdx === 0 ? renderSqlSyntaxCell(cell) : renderTextContent(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTextContent = (text: string) => {
    if (!text) return null;
    
    const lines = text.split('\n').filter(line => line.trim());
    return (
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx}>{renderSqlSyntaxCell(line)}</div>
        ))}
      </div>
    );
  };

  const renderSqlSyntaxCell = (cell: string) => {
    // Handle backtick code formatting for SQL
    const parts = cell.split(/`([^`]+)`/);
    return (
      <span className="flex flex-wrap items-center gap-1">
        {parts.map((part, idx) => {
          if (idx % 2 === 1) {
            // This is SQL code inside backticks
            return (
              <code
                key={idx}
                className="bg-black text-white px-2 py-1 text-sm font-mono border border-gray-700 shadow-sm rounded"
              >
                {part}
              </code>
            );
          }
          return <span key={idx} className="text-gray-700">{part}</span>;
        })}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white font-mono">
        <header className="border-b border-gray-300 px-6 py-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🐱</div>
            <h1 
              className="text-2xl font-bold text-black cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => router.push('/home')}
            >
              9lives
            </h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center h-96">
          <div className="text-6xl mb-4 animate-bounce">🐱</div>
          <div className="text-lg text-gray-600">Loading SQL syntax reference...</div>
        </div>
      </div>
    );
  }

  if (error || !syntaxData) {
    return (
      <div className="min-h-screen bg-white font-mono">
        <header className="border-b border-gray-300 px-6 py-4">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🐱</div>
            <h1 
              className="text-2xl font-bold text-black cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => router.push('/home')}
            >
              9lives
            </h1>
          </div>
        </header>
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <div className="text-xl text-gray-800 mb-2">{error || 'SQL syntax data not found'}</div>
            <button 
              onClick={() => router.back()}
              className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors rounded"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-300 px-6 py-4 sticky top-0 bg-white/95 backdrop-blur-sm z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="text-2xl mr-3">🐱</div>
            <h1 
              className="text-2xl font-bold text-black cursor-pointer hover:text-gray-700 transition-colors"
              onClick={() => router.push('/home')}
            >
              9lives
            </h1>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrevious}
              disabled={parseInt(id) <= 1}
              className={`px-4 py-2 font-medium transition-all rounded ${
                parseInt(id) <= 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800 hover:scale-105'
              }`}
            >
              ← Previous
            </button>
            <div className="text-sm text-gray-500 px-3">
              #{id}
            </div>
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-black text-white font-medium hover:bg-gray-800 hover:scale-105 transition-all rounded"
            >
              Next →
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Title Section */}
        <div className="mb-10 pb-6 border-b border-gray-200">
          <div className="flex items-center mb-4">
            <span className="text-3xl mr-3">🐱</span>
            <h1 className="text-4xl font-bold text-black">{syntaxData.name}</h1>
          </div>
          <div className="flex items-center space-x-4 text-gray-600">
            <span className="text-sm bg-gray-100 text-black px-3 py-1 font-medium rounded">
              SQL Syntax Reference #{syntaxData.id}
            </span>
            <span className="text-sm">•</span>
            <span className="text-sm">Complete Database Guide</span>
            <span className="text-sm">•</span>
            <span className="text-sm flex items-center">
              <span className="mr-1">🏗️</span>
              Multi-Engine Support
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-lg max-w-none">
          {syntaxData.theory ? (
            <div className="space-y-2">
              {renderContent(syntaxData.theory)}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-16">
              <div className="text-8xl mb-6">📊</div>
              <div className="text-2xl font-semibold mb-3">No SQL syntax reference available yet</div>
              <div className="text-lg text-gray-400">This topic hasn't been processed yet</div>
            </div>
          )}
        </div>

        {/* Bottom Navigation */}
        <div className="flex justify-between items-center mt-16 pt-8 border-t border-gray-200">
          <button
            onClick={handlePrevious}
            disabled={parseInt(id) <= 1}
            className={`flex items-center space-x-2 px-6 py-3 font-medium transition-all rounded ${
              parseInt(id) <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            <span>←</span>
            <span>Previous Topic</span>
          </button>

          <div className="text-center">
            <div className="text-sm text-gray-500 mb-1">SQL Topic</div>
            <div className="text-lg font-bold text-blue-800 flex items-center">
              <span className="mr-2">🗄️</span>
              #{id}
            </div>
          </div>

          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-6 py-3 bg-blue-100 text-blue-800 font-medium hover:bg-blue-200 transition-all rounded"
          >
            <span>Next Topic</span>
            <span>→</span>
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 mt-16 bg-gray-100">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 text-gray-600 mb-2">
            <span className="text-lg">🐱</span>
            <span className="font-semibold">9lives</span>
            <span>•</span>
            <span>SQL Syntax Reference</span>
          </div>
          <div className="text-sm text-gray-500">
            Comprehensive SQL syntax guide for database professionals
          </div>
        </div>
      </footer>
    </div>
  );
}