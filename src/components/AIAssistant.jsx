import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, X, Send, Key, Sparkles, TrendingUp, Building2, DollarSign, AlertTriangle } from 'lucide-react';
import { initializeAgent } from '../lib/langgraph';
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SUGGESTED_QUESTIONS = [
  { icon: TrendingUp, label: "Overall statistics", query: "Give me the overall dashboard statistics" },
  { icon: DollarSign, label: "Top companies by fines", query: "Which are the top 5 companies by total fine amount?" },
  { icon: AlertTriangle, label: "Payment analysis", query: "What is the payment collection rate? How many are unpaid?" },
  { icon: Building2, label: "Most common offenses", query: "What are the most common offense sections?" },
];

function MarkdownContent({ content }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export default function AIAssistant({ data }) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agent, setAgent] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySet(true);
      setAgent(initializeAgent(savedKey, data));
    }
  }, [data]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  useEffect(() => {
    if (isOpen && isKeySet) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isKeySet]);

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openai_api_key', apiKey.trim());
      setIsKeySet(true);
      setAgent(initializeAgent(apiKey.trim(), data));
    }
  };

  const handleClearKey = () => {
    localStorage.removeItem('openai_api_key');
    setApiKey('');
    setIsKeySet(false);
    setAgent(null);
    setMessages([]);
  };

  const handleSend = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || !agent) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const allMessages = messages.map(m =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      );
      allMessages.push(new HumanMessage(userMsg));

      const result = await agent.invoke({ messages: allMessages });

      const aiResponse = result.messages[result.messages.length - 1];

      setMessages(prev => [...prev, { role: 'ai', content: aiResponse.content }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        role: 'error',
        content: `**Error:** Could not process your request.\n\n${err.message || 'Check your API key or try again.'}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) {
    return (
      <button
        className="button-primary no-print"
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.5)',
          zIndex: 1000
        }}
      >
        <MessageSquare size={28} />
      </button>
    );
  }

  return (
    <div className="glass-panel no-print" style={{
      position: 'fixed',
      bottom: '1rem',
      right: '1rem',
      width: '400px',
      height: '600px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden',
      resize: 'both',
      minWidth: '320px',
      minHeight: '400px',
    }}>
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.6)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Data Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
          <X size={18} />
        </button>
      </div>

      <div style={{
        flex: 1,
        padding: '1rem',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem'
      }}>
        {!isKeySet ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
            <Key size={36} color="var(--text-muted)" />
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Enter your OpenAI API Key to use the AI Assistant powered by LangGraph.
              It is stored securely in your browser's local storage.
            </p>
            <input
              type="password"
              placeholder="sk-proj-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)',
                fontSize: '0.875rem'
              }}
            />
            <button className="button-primary" style={{ width: '100%', padding: '0.75rem' }} onClick={handleSaveKey}>
              Save Key
            </button>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                <Sparkles size={32} style={{ margin: '0 auto 0.75rem', display: 'block', opacity: 0.5 }} />
                <p style={{ fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Ask me anything about the compound records!
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(q.query)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.03)',
                        color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem',
                        textAlign: 'left', transition: 'var(--transition)'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-primary)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <q.icon size={14} color="var(--accent-primary)" />
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                fontSize: '0.85rem',
                lineHeight: 1.5
              }}>
                {msg.role === 'user' ? (
                  <div style={{
                    background: 'var(--accent-primary)',
                    color: 'white',
                    padding: '0.6rem 0.9rem',
                    borderRadius: '1rem 1rem 0.2rem 1rem',
                    wordBreak: 'break-word'
                  }}>
                    {msg.content}
                  </div>
                ) : msg.role === 'error' ? (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: 'var(--accent-danger)',
                    padding: '0.6rem 0.9rem',
                    borderRadius: '1rem 1rem 1rem 0.2rem',
                  }}>
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  <div style={{
                    background: 'rgba(255,255,255,0.07)',
                    padding: '0.6rem 0.9rem',
                    borderRadius: '1rem 1rem 1rem 0.2rem',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }}>
                    <MarkdownContent content={msg.content} />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div style={{
                alignSelf: 'flex-start',
                background: 'rgba(255,255,255,0.05)',
                padding: '0.75rem 1rem',
                borderRadius: '1rem 1rem 1rem 0.2rem',
                fontSize: '0.85rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  animation: 'pulse 1.2s ease-in-out infinite'
                }} />
                Thinking and searching data...
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {isKeySet && (
        <div style={{
          padding: '0.75rem 1rem',
          borderTop: '1px solid var(--border-color)',
          background: 'rgba(0,0,0,0.2)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              style={{
                flex: 1, padding: '0.65rem 0.9rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.5)',
                color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none'
              }}
            />
            <button
              className="button-primary"
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              style={{ padding: '0 1rem', display: 'flex', alignItems: 'center' }}
            >
              <Send size={16} />
            </button>
          </div>
          <button
            onClick={handleClearKey}
            style={{
              marginTop: '0.4rem', background: 'none', border: 'none',
              color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer',
              padding: 0, textDecoration: 'underline', opacity: 0.6
            }}
          >
            Reset API Key
          </button>
        </div>
      )}
    </div>
  );
}
