import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock Web Speech API
const mockSpeechRecognition = {
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: '',
  onresult: null,
  onerror: null,
  onend: null,
  onstart: null,
};

vi.stubGlobal('webkitSpeechRecognition', vi.fn(() => mockSpeechRecognition));

// Mock window.innerWidth for responsive testing
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(true); // Simulate large screen for sidebar visibility
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('renders the main title', () => {
      render(<App />);
      expect(screen.getByText('Career Observability')).toBeInTheDocument();
    });

    it('renders the subtitle', () => {
      render(<App />);
      expect(screen.getByText('v2.0 - Future Simulator')).toBeInTheDocument();
    });

    it('renders the initial AI message', () => {
      render(<App />);
      expect(screen.getByText(/Career Observability Agent v2.0 起動/)).toBeInTheDocument();
    });

    it('renders all role selection buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /SRE/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Frontend/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Backend/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Mobile/i })).toBeInTheDocument();
    });

    it('renders the input textarea', () => {
      render(<App />);
      expect(screen.getByPlaceholderText(/現在の状況や未来の希望を入力/)).toBeInTheDocument();
    });

    it('renders the send button', () => {
      render(<App />);
      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find(btn => btn.querySelector('svg.lucide-send'));
      expect(sendButton).toBeInTheDocument();
    });

    it('displays the prediction model info', () => {
      render(<App />);
      expect(screen.getByText('GPT-4o')).toBeInTheDocument();
    });
  });

  describe('Role Selection', () => {
    it('SRE is selected by default', () => {
      render(<App />);
      const sreButton = screen.getByRole('button', { name: /SRE/i });
      expect(sreButton).toHaveClass('bg-indigo-600');
    });

    it('can switch to Frontend role', async () => {
      render(<App />);
      const frontendButton = screen.getByRole('button', { name: /Frontend/i });
      await userEvent.click(frontendButton);
      expect(frontendButton).toHaveClass('bg-indigo-600');
    });

    it('can switch to Backend role', async () => {
      render(<App />);
      const backendButton = screen.getByRole('button', { name: /Backend/i });
      await userEvent.click(backendButton);
      expect(backendButton).toHaveClass('bg-indigo-600');
    });

    it('can switch to Mobile role', async () => {
      render(<App />);
      const mobileButton = screen.getByRole('button', { name: /Mobile/i });
      await userEvent.click(mobileButton);
      expect(mobileButton).toHaveClass('bg-indigo-600');
    });

    it('updates header when role changes', async () => {
      render(<App />);
      expect(screen.getByText(/target: sre/)).toBeInTheDocument();

      const frontendButton = screen.getByRole('button', { name: /Frontend/i });
      await userEvent.click(frontendButton);
      expect(screen.getByText(/target: frontend/)).toBeInTheDocument();
    });
  });

  describe('Message Input', () => {
    it('updates input value when typing', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');
      expect(textarea).toHaveValue('テストメッセージ');
    });

    it('send button is disabled when input is empty', () => {
      render(<App />);
      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find(btn => btn.querySelector('svg.lucide-send'));
      expect(sendButton).toBeDisabled();
    });

    it('send button is enabled when input has text', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find(btn => btn.querySelector('svg.lucide-send'));
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe('Message Sending', () => {
    it('adds user message to chat when sending', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find(btn => btn.querySelector('svg.lucide-send'));
      await userEvent.click(sendButton!);

      expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    });

    it('clears input after sending', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/) as HTMLTextAreaElement;
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButtons = screen.getAllByRole('button');
      const sendButton = sendButtons.find(btn => btn.querySelector('svg.lucide-send'));
      await userEvent.click(sendButton!);

      expect(textarea.value).toBe('');
    });

    it('can send message with Enter key', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    });

    it('does not send message with Shift+Enter', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/) as HTMLTextAreaElement;
      await userEvent.type(textarea, 'テストメッセージ');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });

      // Message should not be in chat, only in textarea
      expect(textarea.value).toBe('テストメッセージ');
    });
  });

  describe('UI Elements', () => {
    it('displays live indicator', () => {
      render(<App />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('displays demo tip text', () => {
      render(<App />);
      expect(screen.getByText(/Demo Tip:/)).toBeInTheDocument();
    });

    it('displays system status section', () => {
      render(<App />);
      expect(screen.getByText('System Status')).toBeInTheDocument();
    });

    it('displays target persona section', () => {
      render(<App />);
      expect(screen.getByText('Target Persona')).toBeInTheDocument();
    });

    it('displays AI agent label', () => {
      render(<App />);
      expect(screen.getByText(/OBSERVABILITY AGENT/)).toBeInTheDocument();
    });
  });

  describe('Dashboard', () => {
    it('renders the observability dashboard', () => {
      render(<App />);
      expect(screen.getByText('OBSERVABILITY DASHBOARD')).toBeInTheDocument();
    });

    it('displays career availability metric', () => {
      render(<App />);
      expect(screen.getByText(/Career Availability/)).toBeInTheDocument();
    });

    it('displays error budget metric', () => {
      render(<App />);
      expect(screen.getByText(/Error Budget/)).toBeInTheDocument();
    });

    it('displays velocity metric', () => {
      render(<App />);
      expect(screen.getByText('Velocity')).toBeInTheDocument();
    });

    it('displays innovation metric', () => {
      render(<App />);
      expect(screen.getByText('Innovation')).toBeInTheDocument();
    });

    it('displays live logs section', () => {
      render(<App />);
      expect(screen.getByText('Live Logs')).toBeInTheDocument();
    });
  });

  describe('Voice Input', () => {
    it('renders voice input button when supported', () => {
      render(<App />);
      const voiceButtons = screen.getAllByRole('button');
      const voiceButton = voiceButtons.find(btn =>
        btn.querySelector('svg.lucide-mic') || btn.querySelector('svg.lucide-mic-off')
      );
      expect(voiceButton).toBeInTheDocument();
    });

    it('shows voice status as ready', () => {
      render(<App />);
      expect(screen.getByText('Ready')).toBeInTheDocument();
    });
  });
});
