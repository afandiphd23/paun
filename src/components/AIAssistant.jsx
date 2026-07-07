import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Key } from 'lucide-react';
import { initializeAgent } from '../lib/langgraph';
import { HumanMessage } from "@langchain/core/messages";

export default function AIAssistant({ data }) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isKeySet, setIsKeySet] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agent, setAgent] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
      setApiKey(savedKey);
      setIsKeySet(true);
      setAgent(initializeAgent(savedKey, data));
    }
  }, [data]);

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
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !agent) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      // LangGraph / LangChain invoke pattern for ReAct agents
      const result = await agent.invoke({ messages: [new HumanMessage(userMsg)] });
      
      // Get the last message which is the AI's response
      const aiResponse = result.messages[result.messages.length - 1];
      
      setMessages(prev => [...prev, { role: 'ai', content: aiResponse.content }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'error', content: 'Error: Could not process your request. Check your API key or console.' }]);
    } finally {
      setIsLoading(false);
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
      bottom: '2rem',
      right: '2rem',
      width: '350px',
      height: '550px',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <MessageSquare size={20} color="var(--accent-primary)" />
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Data Assistant</h3>
        </div>
        <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!isKeySet ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
            <Key size={40} color="var(--text-muted)" />
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              To use the LangGraph AI Assistant, please enter your OpenAI API Key. It is stored securely in your browser's local storage.
            </p>
            <input 
              type="password" 
              placeholder="sk-proj-..." 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-primary)'
              }}
            />
            <button className="button-primary" style={{ width: '100%' }} onClick={handleSaveKey}>Save Key</button>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem' }}>
                <p>Hello! I am your AI Data Assistant powered by LangGraph. Ask me questions about your compound records!</p>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div key={idx} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? 'var(--accent-primary)' : msg.role === 'error' ? 'var(--accent-danger)' : 'rgba(255,255,255,0.1)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                padding: '0.75rem 1rem',
                borderRadius: '1rem',
                borderBottomRightRadius: msg.role === 'user' ? '0' : '1rem',
                borderBottomLeftRadius: msg.role !== 'user' ? '0' : '1rem',
                maxWidth: '85%',
                fontSize: '0.875rem',
                lineHeight: '1.4'
              }}>
                {msg.content}
              </div>
            ))}
            
            {isLoading && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', padding: '0.75rem 1rem', borderRadius: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Thinking and searching data...
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Footer */}
      {isKeySet && (
        <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Ask a question..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              style={{
                flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)', background: 'rgba(15, 23, 42, 0.5)', color: 'var(--text-primary)'
              }}
            />
            <button 
              className="button-primary" 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              style={{ padding: '0 1rem' }}
            >
              <Send size={18} />
            </button>
          </div>
          <button 
            onClick={handleClearKey} 
            style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            Change API Key
          </button>
        </div>
      )}
    </div>
  );
}
