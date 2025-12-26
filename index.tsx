
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { 
  MessageSquare, 
  Image as ImageIcon, 
  Mic, 
  MicOff, 
  Send, 
  Sparkles, 
  LayoutDashboard, 
  History,
  Settings,
  ChevronRight,
  Terminal,
  Loader2,
  Download,
  Plus
} from 'lucide-react';

// --- Types ---
type AppMode = 'dashboard' | 'chat' | 'vision' | 'live';

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// --- Utils ---
const encode = (bytes: Uint8Array) => {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// --- Components ---

const App = () => {
  const [mode, setMode] = useState<AppMode>('dashboard');
  const [apiKey] = useState(process.env.API_KEY || '');

  return (
    <div className="flex h-screen w-full bg-zinc-950 overflow-hidden text-zinc-100">
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 flex flex-col border-r border-zinc-800 bg-zinc-900/50">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight">Nexus</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard />} 
            label="Dashboard" 
            active={mode === 'dashboard'} 
            onClick={() => setMode('dashboard')} 
          />
          <SidebarItem 
            icon={<MessageSquare />} 
            label="Chat" 
            active={mode === 'chat'} 
            onClick={() => setMode('chat')} 
          />
          <SidebarItem 
            icon={<ImageIcon />} 
            label="Vision" 
            active={mode === 'vision'} 
            onClick={() => setMode('vision')} 
          />
          <SidebarItem 
            icon={<Mic />} 
            label="Live" 
            active={mode === 'live'} 
            onClick={() => setMode('live')} 
          />
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <div className="hidden lg:flex items-center gap-3 px-2 py-3 rounded-xl hover:bg-zinc-800/50 cursor-pointer transition-colors">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium">Settings</p>
              <p className="text-[10px] text-zinc-500">v2.5 Pro</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {mode === 'dashboard' && <Dashboard setMode={setMode} />}
        {mode === 'chat' && <ChatView />}
        {mode === 'vision' && <VisionView />}
        {mode === 'live' && <LiveView />}
      </main>
    </div>
  );
};

const SidebarItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-600/20' 
        : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/50'
    }`}
  >
    {/* Fix: Cast icon to React.ReactElement<any> to ensure the compiler allows cloning with a 'size' prop */}
    <span className={`${active ? 'text-indigo-400' : ''}`}>{React.cloneElement(icon as React.ReactElement<any>, { size: 20 })}</span>
    <span className="hidden lg:block font-medium text-sm">{label}</span>
  </button>
);

const Dashboard = ({ setMode }: { setMode: (m: AppMode) => void }) => (
  <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
    <header className="mb-12">
      <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent">
        Welcome to Gemini Nexus
      </h1>
      <p className="text-zinc-400 text-lg">Your unified interface for state-of-the-art AI generation and reasoning.</p>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <FeatureCard 
        title="Reasoning Chat"
        desc="Deep analysis and code generation powered by Gemini 3 Pro."
        icon={<Terminal className="w-6 h-6 text-emerald-400" />}
        color="emerald"
        onClick={() => setMode('chat')}
      />
      <FeatureCard 
        title="Image Studio"
        desc="Convert natural language into vivid visual assets in seconds."
        icon={<ImageIcon className="w-6 h-6 text-purple-400" />}
        color="purple"
        onClick={() => setMode('vision')}
      />
      <FeatureCard 
        title="Live Pulse"
        desc="Experience zero-latency voice interactions with natural audio."
        icon={<Mic className="w-6 h-6 text-blue-400" />}
        color="blue"
        onClick={() => setMode('live')}
      />
    </div>

    <section className="mt-16">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <History className="w-5 h-5" /> Recent Capabilities
      </h2>
      <div className="space-y-4">
        {[
          "Multimodal reasoning across text and audio",
          "Low-latency streaming responses",
          "Built-in Google Search grounding support",
          "High-fidelity image generation"
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between p-4 glass rounded-2xl hover:border-zinc-700 transition-colors cursor-default">
            <span className="text-sm text-zinc-300">{item}</span>
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          </div>
        ))}
      </div>
    </section>
  </div>
);

const FeatureCard = ({ title, desc, icon, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className="group relative p-8 glass rounded-3xl hover:border-indigo-500/50 cursor-pointer transition-all duration-300 hover:-translate-y-1"
  >
    <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-zinc-400 text-sm leading-relaxed">{desc}</p>
    <div className="absolute top-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity">
      <Sparkles className="w-5 h-5 text-indigo-400" />
    </div>
  </div>
);

const ChatView = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: "You are Gemini Nexus, a world-class senior engineer and advisor. Be concise, technical where necessary, and helpful." }
      });

      const response = await chat.sendMessage({ message: input });
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'Error generating response.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: 'Error: Connection lost.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 lg:p-8">
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-6 px-2 lg:px-20 pb-20">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
            <MessageSquare className="w-12 h-12 mb-4" />
            <p className="text-lg">Start a conversation with Gemini 3 Pro</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] lg:max-w-[70%] p-4 rounded-2xl ${
              m.role === 'user' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                : 'glass text-zinc-100'
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="glass p-4 rounded-2xl flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-sm text-zinc-400 italic">Nexus is thinking...</span>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-0 right-0 px-4 lg:px-20">
        <div className="max-w-4xl mx-auto glass p-2 rounded-2xl flex items-center gap-2 shadow-2xl">
          <input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..." 
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm px-4"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-indigo-600 rounded-xl hover:bg-indigo-500 disabled:opacity-50 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const VisionView = () => {
  const [prompt, setPrompt] = useState('');
  const [aspect, setAspect] = useState<'1:1' | '16:9' | '9:16'>('1:1');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { imageConfig: { aspectRatio: aspect } }
      });
      
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          setImage(`data:image/png;base64,${part.inlineData.data}`);
          break;
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        <header className="mb-8">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ImageIcon className="text-purple-400" /> Image Studio
          </h2>
          <p className="text-zinc-500 text-sm">Create detailed visual assets using natural language.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Prompt</label>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="A futuristic cybernetic city floating in the clouds, synthwave color palette, 8k resolution..."
                className="w-full h-40 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-sm focus:border-purple-500 transition-colors resize-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Aspect Ratio</label>
              <div className="flex gap-2">
                {(['1:1', '16:9', '9:16'] as const).map(a => (
                  <button 
                    key={a}
                    onClick={() => setAspect(a)}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border ${aspect === a ? 'bg-purple-600/10 border-purple-500 text-purple-400' : 'border-zinc-800 bg-zinc-900'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="w-full py-4 bg-purple-600 rounded-2xl font-bold hover:bg-purple-500 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Plus />}
              {loading ? 'Synthesizing...' : 'Generate Image'}
            </button>
          </div>

          <div className="lg:col-span-2 min-h-[400px] flex items-center justify-center glass rounded-3xl overflow-hidden relative">
            {image ? (
              <>
                <img src={image} className="w-full h-full object-contain" alt="Generated" />
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = image;
                    link.download = 'nexus-generation.png';
                    link.click();
                  }}
                  className="absolute bottom-4 right-4 p-3 bg-zinc-900/80 rounded-xl hover:bg-zinc-800"
                >
                  <Download size={20} />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center text-zinc-600">
                {loading ? (
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-4 border-purple-500/20 border-t-purple-500 animate-spin" />
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-purple-400 animate-pulse" />
                  </div>
                ) : (
                  <>
                    <ImageIcon size={48} className="mb-4 opacity-20" />
                    <p className="text-sm">Enter a prompt to see the magic</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveView = () => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef(new Set<AudioBufferSourceNode>());

  const stopLive = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsActive(false);
    setIsConnecting(false);
    for (const source of sourcesRef.current) {
      source.stop();
    }
    sourcesRef.current.clear();
  }, []);

  const startLive = async () => {
    setIsConnecting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) int16[i] = inputData[i] * 32768;
              
              const pcmBlob = {
                data: encode(new Uint8Array(int16.buffer)),
                mimeType: 'audio/pcm;rate=16000',
              };
              
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.serverContent?.outputTranscription) {
               setTranscript(prev => [...prev, {role: 'model', text: message.serverContent!.outputTranscription!.text}]);
            }
            if (message.serverContent?.inputTranscription) {
               setTranscript(prev => [...prev, {role: 'user', text: message.serverContent!.inputTranscription!.text}]);
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const ctx = outputAudioContextRef.current!;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              for (const s of sourcesRef.current) s.stop();
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopLive(),
          onerror: (e) => {
            console.error(e);
            stopLive();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are Gemini Pulse, a friendly and extremely fast voice AI. Respond naturally to spoken conversation.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950">
      <div className="relative mb-12 flex items-center justify-center">
        <div className={`absolute w-64 h-64 rounded-full border-2 border-indigo-500/20 ${isActive ? 'animate-ping' : ''}`} />
        <div className={`absolute w-80 h-80 rounded-full border border-indigo-500/10 ${isActive ? 'animate-pulse-slow' : ''}`} />
        
        <button 
          onClick={isActive ? stopLive : startLive}
          disabled={isConnecting}
          className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
            isActive 
              ? 'bg-red-500 shadow-red-500/20 hover:scale-95' 
              : 'bg-indigo-600 shadow-indigo-600/40 hover:scale-105'
          }`}
        >
          {isConnecting ? (
            <Loader2 className="w-12 h-12 animate-spin text-white" />
          ) : isActive ? (
            <MicOff className="w-12 h-12 text-white" />
          ) : (
            <Mic className="w-12 h-12 text-white" />
          )}
        </button>
      </div>

      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">
          {isActive ? 'Pulse is Listening...' : isConnecting ? 'Establishing Connection...' : 'Click to Wake Pulse'}
        </h2>
        <p className="text-zinc-500 max-w-md">
          {isActive 
            ? 'Speak naturally. I can hear you and respond in real-time.' 
            : 'Powered by native multi-modal audio processing for ultra-low latency interaction.'}
        </p>
      </div>

      {isActive && (
        <div className="mt-12 w-full max-w-2xl max-h-[200px] overflow-y-auto glass rounded-3xl p-6 flex flex-col gap-3">
          {transcript.slice(-5).map((t, i) => (
            <div key={i} className={`flex gap-3 text-sm ${t.role === 'user' ? 'text-zinc-400' : 'text-indigo-400 font-medium'}`}>
              <span className="uppercase text-[10px] font-bold mt-1 tracking-widest">{t.role}:</span>
              <span>{t.text}</span>
            </div>
          ))}
          {transcript.length === 0 && <p className="text-zinc-600 italic text-center text-sm">Waiting for speech...</p>}
        </div>
      )}
    </div>
  );
};

// --- Render ---
const root = createRoot(document.getElementById('root')!);
root.render(<App />);
