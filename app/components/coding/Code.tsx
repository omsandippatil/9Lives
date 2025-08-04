'use client';
import { useState, useRef, useEffect } from 'react';

interface CodeEditorProps {
  language: string;
  functionName: string;
  completeCode: string;
  onCodeChange: (code: string) => void;
  initialCode?: string;
}

function extractPythonTemplate(completeCode: string, functionName: string): string {
  const lines = completeCode.split('\n');
  const result: string[] = [];
  let inFunction = false;
  let functionIndent = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine && result.length === 0) continue;
    
    if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('from ')) {
      result.push(line);
      continue;
    }
    
    if (trimmedLine.startsWith('class ')) {
      result.push(line);
      continue;
    }
    
    if (trimmedLine.startsWith('def ')) {
      const functionMatch = trimmedLine.match(/def\s+(\w+)/);
      if (functionMatch) {
        const funcName = functionMatch[1];
        
        if (funcName === functionName) {
          result.push(line);
          const indentMatch = line.match(/^(\s*)/);
          const indent = indentMatch ? indentMatch[1] : '';
          result.push(indent + '    # Your code here');
          result.push(indent + '    pass');
          
          inFunction = true;
          functionIndent = indent.length;
          continue;
        } else {
          result.push(line);
          inFunction = false;
        }
      }
      continue;
    }
    
    if (inFunction) {
      const currentIndentMatch = line.match(/^(\s*)/);
      const currentIndent = currentIndentMatch ? currentIndentMatch[1].length : 0;
      if (trimmedLine && currentIndent <= functionIndent) {
        inFunction = false;
        result.push(line);
      }
      continue;
    }
    
    if (trimmedLine) {
      result.push(line);
    }
  }
  
  return result.join('\n');
}

function extractJavaTemplate(completeCode: string, functionName: string): string {
  const lines = completeCode.split('\n');
  const result: string[] = [];
  let inFunction = false;
  let braceLevel = 0;
  let functionBraceLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    
    if (!trimmedLine && result.length === 0) continue;
    
    if (trimmedLine.startsWith('import ') || trimmedLine.startsWith('package ')) {
      result.push(line);
      continue;
    }
    
    if (trimmedLine.includes('class ')) {
      result.push(line);
      continue;
    }
    
    const openBraces = (line.match(/{/g) || []).length;
    const closeBraces = (line.match(/}/g) || []).length;
    
    if (trimmedLine.includes(functionName) && (trimmedLine.includes('public') || trimmedLine.includes('private') || trimmedLine.includes('protected'))) {
      const methodSignature = trimmedLine.replace(/\s*\{.*$/, '') + ' {';
      result.push(line.replace(trimmedLine, methodSignature));
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch ? indentMatch[1] : '';
      result.push(indent + '    // Your code here');
      
      let returnStatement = 'return "";';
      if (trimmedLine.includes(' int ') || trimmedLine.includes(' Integer ')) {
        returnStatement = 'return 0;';
      } else if (trimmedLine.includes(' boolean ') || trimmedLine.includes(' Boolean ')) {
        returnStatement = 'return false;';
      } else if (trimmedLine.includes(' void ')) {
        returnStatement = '// return; // void method';
      } else if (trimmedLine.includes(' List<') || trimmedLine.includes(' ArrayList<')) {
        returnStatement = 'return new ArrayList<>();';
      } else if (trimmedLine.includes(' String[]')) {
        returnStatement = 'return new String[0];';
      } else if (trimmedLine.includes(' int[]')) {
        returnStatement = 'return new int[0];';
      }
      
      result.push(indent + '    ' + returnStatement);
      result.push(indent + '}');
      
      inFunction = true;
      functionBraceLevel = braceLevel + 1;
      braceLevel += openBraces - closeBraces;
      continue;
    }
    
    if (inFunction) {
      braceLevel += openBraces - closeBraces;
      if (braceLevel < functionBraceLevel) {
        inFunction = false;
      } else {
        continue;
      }
    }
    
    if (!inFunction) {
      braceLevel += openBraces - closeBraces;
      result.push(line);
    }
  }
  
  return result.join('\n');
}

function getInitialCode(initialCode: string | undefined, language: string, completeCode: string, functionName: string): string {
  if (initialCode) return initialCode;
  
  if (language.toLowerCase() === 'python') {
    return extractPythonTemplate(completeCode, functionName);
  } else if (language.toLowerCase() === 'java') {
    return extractJavaTemplate(completeCode, functionName);
  } else {
    return '// Your code here';
  }
}

function highlightCode(code: string, language: string): React.ReactNode[] {
  const lines = code.split('\n');
  
  return lines.map((line, lineIndex) => {
    if (!line.trim()) {
      return (
        <div key={lineIndex} style={{ height: '1.6em' }}>
          <br />
        </div>
      );
    }

    const tokens: React.ReactNode[] = [];
    let currentIndex = 0;
    
    // Handle indentation
    const indentMatch = line.match(/^(\s*)/);
    if (indentMatch && indentMatch[1]) {
      tokens.push(
        <span key={`indent-${lineIndex}`} style={{ whiteSpace: 'pre' }}>
          {indentMatch[1]}
        </span>
      );
      currentIndex = indentMatch[1].length;
    }
    
    const remainingLine = line.substring(currentIndex);
    
    if (language.toLowerCase() === 'python') {
      // Python syntax highlighting
      const patterns = [
        { regex: /\b(def|class|if|elif|else|for|while|try|except|finally|with|import|from|return|pass|break|continue|and|or|not|in|is|None|True|False)\b/, color: '#0066cc', fontWeight: 'bold' },
        { regex: /#.*$/, color: '#008000', fontStyle: 'italic' },
        { regex: /(['"])((?:\\.|(?!\1)[^\\])*?)\1/, color: '#008000' },
        { regex: /\b\d+\.?\d*\b/, color: '#cc6600' }
      ];
      
      tokens.push(...tokenizeLine(remainingLine, patterns, lineIndex));
    } else if (language.toLowerCase() === 'java') {
      // Java syntax highlighting
      const patterns = [
        { regex: /\b(public|private|protected|static|final|abstract|class|interface|extends|implements|import|package|return|if|else|for|while|do|switch|case|default|break|continue|try|catch|finally|throw|throws|new|this|super|null|true|false|int|long|short|byte|char|float|double|boolean|String|void)\b/, color: '#0066cc', fontWeight: 'bold' },
        { regex: /\/\/.*$/, color: '#008000', fontStyle: 'italic' },
        { regex: /\/\*[\s\S]*?\*\//, color: '#008000', fontStyle: 'italic' },
        { regex: /(['"])((?:\\.|(?!\1)[^\\])*?)\1/, color: '#008000' },
        { regex: /\b\d+\.?\d*[fFdDlL]?\b/, color: '#cc6600' }
      ];
      
      tokens.push(...tokenizeLine(remainingLine, patterns, lineIndex));
    } else {
      tokens.push(<span key={`plain-${lineIndex}`}>{remainingLine}</span>);
    }
    
    return <div key={lineIndex}>{tokens}</div>;
  });
}

function tokenizeLine(line: string, patterns: Array<{regex: RegExp, color: string, fontWeight?: string, fontStyle?: string}>, lineIndex: number): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = line;
  let tokenIndex = 0;
  
  while (remaining.length > 0) {
    let matched = false;
    
    for (const pattern of patterns) {
      const match = remaining.match(pattern.regex);
      if (match && match.index === 0) {
        const matchedText = match[0];
        tokens.push(
          <span 
            key={`token-${lineIndex}-${tokenIndex}`}
            style={{ 
              color: pattern.color,
              fontWeight: pattern.fontWeight || 'normal',
              fontStyle: pattern.fontStyle || 'normal'
            }}
          >
            {matchedText}
          </span>
        );
        remaining = remaining.substring(matchedText.length);
        tokenIndex++;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Take one character if no pattern matches
      const char = remaining[0];
      tokens.push(<span key={`char-${lineIndex}-${tokenIndex}`}>{char}</span>);
      remaining = remaining.substring(1);
      tokenIndex++;
    }
  }
  
  return tokens;
}

export default function CodeEditor({
  language,
  functionName,
  completeCode,
  onCodeChange,
  initialCode
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [code, setCode] = useState(() => getInitialCode(initialCode, language, completeCode, functionName));

  const getIndentSize = (): number => {
    return 4; // 4 spaces for both languages
  };

  const getIndentLevel = (line: string): number => {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  };

  const shouldIncreaseIndent = (line: string): boolean => {
    const trimmed = line.trim();
    if (language.toLowerCase() === 'python') {
      return trimmed.endsWith(':') || 
             trimmed.startsWith('if ') || 
             trimmed.startsWith('elif ') || 
             trimmed.startsWith('else:') ||
             trimmed.startsWith('for ') || 
             trimmed.startsWith('while ') ||
             trimmed.startsWith('def ') ||
             trimmed.startsWith('class ') ||
             trimmed.startsWith('try:') ||
             trimmed.startsWith('except') ||
             trimmed.startsWith('finally:') ||
             trimmed.startsWith('with ');
    } else if (language.toLowerCase() === 'java') {
      return trimmed.endsWith('{') ||
             trimmed.includes('if (') ||
             trimmed.includes('else') ||
             trimmed.includes('for (') ||
             trimmed.includes('while (') ||
             trimmed.includes('do ') ||
             trimmed.includes('try') ||
             trimmed.includes('catch') ||
             trimmed.includes('finally') ||
             trimmed.includes('switch');
    }
    return false;
  };

  const getMatchingBracket = (char: string): string | undefined => {
    const brackets: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'"
    };
    return brackets[char];
  };

  const syncScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', syncScroll);
      return () => textarea.removeEventListener('scroll', syncScroll);
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;
    const indentSize = getIndentSize();
    const indent = ' '.repeat(indentSize);

    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      
      if (selectionStart === selectionEnd) {
        // No selection - add indent
        const newValue = value.substring(0, selectionStart) + indent + value.substring(selectionEnd);
        setCode(newValue);
        onCodeChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + indentSize;
        }, 0);
      } else {
        // Selection exists - indent/unindent lines
        const lines = value.split('\n');
        const startLine = value.substring(0, selectionStart).split('\n').length - 1;
        const endLine = value.substring(0, selectionEnd).split('\n').length - 1;
        
        for (let i = startLine; i <= endLine; i++) {
          if (e.shiftKey) {
            // Unindent
            if (lines[i].startsWith(indent)) {
              lines[i] = lines[i].substring(indentSize);
            } else if (lines[i].startsWith(' ')) {
              lines[i] = lines[i].substring(1);
            }
          } else {
            // Indent
            lines[i] = indent + lines[i];
          }
        }
        
        const newValue = lines.join('\n');
        setCode(newValue);
        onCodeChange(newValue);
      }
      return;
    }

    // Handle Enter key for auto-indentation
    if (e.key === 'Enter') {
      e.preventDefault();
      
      const lines = value.substring(0, selectionStart).split('\n');
      const currentLine = lines[lines.length - 1];
      const currentIndent = getIndentLevel(currentLine);
      
      let newIndent = currentIndent;
      
      // Increase indent if needed
      if (shouldIncreaseIndent(currentLine)) {
        newIndent += indentSize;
      }
      
      // For Java, handle closing braces
      if (language.toLowerCase() === 'java' && currentLine.trim().endsWith('{')) {
        const nextChar = value[selectionStart];
        if (nextChar === '}') {
          // Add line with increased indent and line with current indent for closing brace
          const newValue = 
            value.substring(0, selectionStart) + 
            '\n' + ' '.repeat(newIndent) + 
            '\n' + ' '.repeat(currentIndent) + 
            value.substring(selectionEnd);
          
          setCode(newValue);
          onCodeChange(newValue);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + newIndent;
          }, 0);
          return;
        }
      }
      
      const newValue = 
        value.substring(0, selectionStart) + 
        '\n' + ' '.repeat(newIndent) + 
        value.substring(selectionEnd);
      
      setCode(newValue);
      onCodeChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + newIndent;
      }, 0);
      return;
    }

    // Handle bracket auto-completion
    const char = e.key;
    const matchingBracket = getMatchingBracket(char);
    
    if (matchingBracket && selectionStart === selectionEnd) {
      // Don't auto-complete quotes if already inside quotes
      if ((char === '"' || char === "'") && value[selectionStart - 1] === char) {
        return;
      }
      
      e.preventDefault();
      const newValue = 
        value.substring(0, selectionStart) + 
        char + matchingBracket + 
        value.substring(selectionEnd);
      
      setCode(newValue);
      onCodeChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Handle closing bracket skipping
    if ((char === ')' || char === ']' || char === '}' || char === '"' || char === "'") && 
        value[selectionStart] === char) {
      e.preventDefault();
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Handle Backspace for smart deletion
    if (e.key === 'Backspace' && selectionStart === selectionEnd && selectionStart > 0) {
      const prevChar = value[selectionStart - 1];
      const nextChar = value[selectionStart];
      const matchingBracket = getMatchingBracket(prevChar);
      
      // Delete matching bracket pair
      if (matchingBracket === nextChar) {
        e.preventDefault();
        const newValue = 
          value.substring(0, selectionStart - 1) + 
          value.substring(selectionStart + 1);
        
        setCode(newValue);
        onCodeChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
        }, 0);
        return;
      }
      
      // Handle indentation deletion
      if (prevChar === ' ') {
        const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
        const beforeCursor = value.substring(lineStart, selectionStart);
        
        if (beforeCursor.trim() === '' && beforeCursor.length >= indentSize) {
          // Delete entire indent level
          e.preventDefault();
          const spacesToDelete = beforeCursor.length % indentSize || indentSize;
          const newValue = 
            value.substring(0, selectionStart - spacesToDelete) + 
            value.substring(selectionStart);
          
          setCode(newValue);
          onCodeChange(newValue);
          
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart - spacesToDelete;
          }, 0);
          return;
        }
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    onCodeChange(newCode);
  };

  return (
    <div className="flex-1 p-4 overflow-hidden relative">
      <div className="relative w-full h-full border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* Syntax highlighted background */}
        <div
          ref={highlightRef}
          className="absolute top-0 left-0 w-full h-full p-4 font-mono text-sm pointer-events-none overflow-auto whitespace-pre-wrap"
          style={{
            tabSize: getIndentSize(),
            lineHeight: '1.6',
            color: '#000',
            background: '#fafafa'
          }}
        >
          {highlightCode(code, language)}
        </div>
        
        {/* Transparent textarea overlay */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          className="absolute top-0 left-0 w-full h-full p-4 font-mono text-sm resize-none bg-transparent border-none outline-none"
          placeholder={`Write your ${language} code here...`}
          spellCheck={false}
          style={{
            tabSize: getIndentSize(),
            lineHeight: '1.6',
            color: 'transparent',
            caretColor: '#000',
            background: 'transparent'
          }}
        />
      </div>
      
      <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow border">
        {language.toUpperCase()} | Tab: Indent | Shift+Tab: Unindent
      </div>
    </div>
  );
}