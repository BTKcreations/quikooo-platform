import React, { useState } from 'react';

const FAQS = [
  {
    q: 'How does the ₹100 -> ₹135 transparent pricing work?',
    a: 'We believe in full transparency: ₹100 original item + ₹5 (5% menu adjustment) = ₹105 menu price. We add ₹5 platform fee and ₹25 delivery fee (paid directly to the driver partner). Total: ₹135. The vendor receives ₹90 (after standard 10% commission).',
  },
  {
    q: 'What is the 10-15 minute delivery geofence?',
    a: 'Each dark store or partner kitchen serves an optimized 2.0 km geofence with assigned riders waiting on standby, enabling ultra-fast delivery with zero delay.',
  },
  {
    q: 'How do I cancel or modify my active order?',
    a: 'Orders can be cancelled before the kitchen starts preparation (under 60 seconds from placement) directly from the live order tracker screen.',
  },
];

export default function SupportModal({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('faq'); // 'faq' | 'chat'
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Hi there! 👋 How can we help you today with your Quikooo experience?' },
  ]);
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userText = inputVal.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInputVal('');

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Thanks for messaging us about "${userText}". Our hyper-support team is actively tracking your order and will assist you right away!`,
        },
      ]);
    }, 600);
  };

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Help & Support Modal">
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3F4F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem' }}>Quikooo 24/7 Support</h2>
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>🟢 Fast Response Guarantee</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.25rem', color: '#4B5563', cursor: 'pointer', minHeight: '44px', minWidth: '44px' }}
            aria-label="Close support modal"
          >
            ✕
          </button>
        </div>

        {/* Tab Toggle */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F0' }}>
          <button
            onClick={() => setActiveTab('faq')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === 'faq' ? '#059669' : '#6B7280',
              borderBottom: activeTab === 'faq' ? '2px solid #059669' : '2px solid transparent',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Instant Answers
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              flex: 1,
              padding: '0.75rem',
              border: 'none',
              background: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
              color: activeTab === 'chat' ? '#059669' : '#6B7280',
              borderBottom: activeTab === 'chat' ? '2px solid #059669' : '2px solid transparent',
              cursor: 'pointer',
              minHeight: '44px',
            }}
          >
            Live Chat
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {activeTab === 'faq' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {FAQS.map((faq, i) => (
                <div key={i} className="card" style={{ padding: '0.875rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: '0.35rem' }}>
                    {faq.q}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: '#4B5563', lineHeight: 1.5 }}>
                    {faq.a}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem' }}>
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    style={{
                      alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      backgroundColor: m.sender === 'user' ? '#059669' : '#F3F4F6',
                      color: m.sender === 'user' ? '#FFFFFF' : '#111827',
                      padding: '0.6rem 0.85rem',
                      borderRadius: '0.75rem',
                      fontSize: '0.85rem',
                      lineHeight: 1.4,
                    }}
                  >
                    {m.text}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Type a message..."
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  style={{ minHeight: '44px' }}
                />
                <button type="submit" className="btn-primary" style={{ minHeight: '44px', padding: '0 1rem' }}>
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
