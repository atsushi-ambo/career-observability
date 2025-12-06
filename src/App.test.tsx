import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

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
    localStorageMock.clear();
    mockMatchMedia(true); // Simulate large screen for sidebar visibility
  });

  afterEach(() => {
    cleanup();
  });

  describe('Initial Rendering', () => {
    it('renders the main title', () => {
      render(<App />);
      // Use getAllByText because title appears in both desktop and mobile sidebars
      const titles = screen.getAllByText('ORACLE-7');
      expect(titles.length).toBeGreaterThan(0);
    });

    it('renders the subtitle', () => {
      render(<App />);
      const subtitles = screen.getAllByText(/Career Oracle v3\.0\.77/);
      expect(subtitles.length).toBeGreaterThan(0);
    });

    it('renders the initial AI message', () => {
      render(<App />);
      expect(screen.getByText(/ORACLE-7 QUANTUM LINK ESTABLISHED/)).toBeInTheDocument();
    });

    it('renders all role selection buttons', () => {
      render(<App />);
      // Multiple buttons exist (mobile + desktop), so use getAllByRole
      const sreButtons = screen.getAllByRole('button', { name: /SREロールを選択/i });
      const frontendButtons = screen.getAllByRole('button', { name: /Frontendロールを選択/i });
      const backendButtons = screen.getAllByRole('button', { name: /Backendロールを選択/i });
      const mobileButtons = screen.getAllByRole('button', { name: /Mobileロールを選択/i });

      expect(sreButtons.length).toBeGreaterThan(0);
      expect(frontendButtons.length).toBeGreaterThan(0);
      expect(backendButtons.length).toBeGreaterThan(0);
      expect(mobileButtons.length).toBeGreaterThan(0);
    });

    it('renders the input textarea', () => {
      render(<App />);
      expect(screen.getByPlaceholderText(/現在の状況や未来の希望を入力/)).toBeInTheDocument();
    });

    it('renders the send button', () => {
      render(<App />);
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      expect(sendButton).toBeInTheDocument();
    });

    it('displays the prediction model info', () => {
      render(<App />);
      const modelInfos = screen.getAllByText('GPT-5*');
      expect(modelInfos.length).toBeGreaterThan(0);
    });
  });

  describe('Role Selection', () => {
    it('SRE is selected by default', () => {
      render(<App />);
      const sreButtons = screen.getAllByRole('button', { name: /SREロールを選択/i });
      // At least one should be selected (using new gradient class)
      const selectedButton = sreButtons.find(btn => btn.classList.contains('from-cyan-600'));
      expect(selectedButton).toBeTruthy();
    });

    it('can switch to Frontend role', async () => {
      render(<App />);
      const frontendButtons = screen.getAllByRole('button', { name: /Frontendロールを選択/i });
      await userEvent.click(frontendButtons[0]);
      expect(frontendButtons[0]).toHaveClass('from-cyan-600');
    });

    it('can switch to Backend role', async () => {
      render(<App />);
      const backendButtons = screen.getAllByRole('button', { name: /Backendロールを選択/i });
      await userEvent.click(backendButtons[0]);
      expect(backendButtons[0]).toHaveClass('from-cyan-600');
    });

    it('can switch to Mobile role', async () => {
      render(<App />);
      const mobileButtons = screen.getAllByRole('button', { name: /Mobileロールを選択/i });
      await userEvent.click(mobileButtons[0]);
      expect(mobileButtons[0]).toHaveClass('from-cyan-600');
    });

    it('updates header when role changes', async () => {
      render(<App />);
      expect(screen.getByText(/target: sre/)).toBeInTheDocument();

      const frontendButtons = screen.getAllByRole('button', { name: /Frontendロールを選択/i });
      await userEvent.click(frontendButtons[0]);
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
      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      expect(sendButton).toBeDisabled();
    });

    it('send button is enabled when input has text', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      expect(sendButton).not.toBeDisabled();
    });

    it('shows character count', () => {
      render(<App />);
      // Initial character count should be 1000 (max length)
      expect(screen.getByText('1000')).toBeInTheDocument();
    });

    it('updates character count when typing', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テスト');
      // 1000 - 3 = 997
      expect(screen.getByText('997')).toBeInTheDocument();
    });
  });

  describe('Message Sending', () => {
    it('adds user message to chat when sending', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      await userEvent.click(sendButton);

      expect(screen.getByText('テストメッセージ')).toBeInTheDocument();
    });

    it('clears input after sending', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/) as HTMLTextAreaElement;
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      await userEvent.click(sendButton);

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
      const demoTips = screen.getAllByText(/Demo Tip:/);
      expect(demoTips.length).toBeGreaterThan(0);
    });

    it('displays system status section', () => {
      render(<App />);
      const systemStatuses = screen.getAllByText('SYSTEM_STATUS');
      expect(systemStatuses.length).toBeGreaterThan(0);
    });

    it('displays target persona section', () => {
      render(<App />);
      const targetPersonas = screen.getAllByText('JOB CLASS SELECT');
      expect(targetPersonas.length).toBeGreaterThan(0);
    });

    it('displays AI agent label', () => {
      render(<App />);
      // ORACLE-7 appears as the agent name in the new cyberpunk theme
      const oracleLabels = screen.getAllByText('ORACLE-7');
      expect(oracleLabels.length).toBeGreaterThan(0);
    });

    it('displays keyboard shortcut hint', () => {
      render(<App />);
      expect(screen.getByText(/Enter で送信/)).toBeInTheDocument();
    });
  });

  describe('New Features', () => {
    it('displays quick prompts section', () => {
      render(<App />);
      const quickPrompts = screen.getAllByText('QUICK_CMD');
      expect(quickPrompts.length).toBeGreaterThan(0);
    });

    it('displays sample question buttons', () => {
      render(<App />);
      const systemAlertButtons = screen.getAllByRole('button', { name: /サンプル質問: SYSTEM_ALERT/i });
      expect(systemAlertButtons.length).toBeGreaterThan(0);
    });

    it('clicking sample question fills input', async () => {
      render(<App />);
      const systemAlertButtons = screen.getAllByRole('button', { name: /サンプル質問: SYSTEM_ALERT/i });
      await userEvent.click(systemAlertButtons[0]);

      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/) as HTMLTextAreaElement;
      expect(textarea.value).toContain('システム');
    });

    it('displays export chat button', () => {
      render(<App />);
      const exportButtons = screen.getAllByRole('button', { name: /会話をエクスポート/i });
      expect(exportButtons.length).toBeGreaterThan(0);
    });

    it('displays clear chat button', () => {
      render(<App />);
      const clearButtons = screen.getAllByRole('button', { name: /会話をクリア/i });
      expect(clearButtons.length).toBeGreaterThan(0);
    });

    it('displays mobile menu button', () => {
      render(<App />);
      const menuButton = screen.getByRole('button', { name: /メニューを開く/i });
      expect(menuButton).toBeInTheDocument();
    });

    it('displays mobile dashboard button', () => {
      render(<App />);
      const dashboardButton = screen.getByRole('button', { name: /ダッシュボードを表示/i });
      expect(dashboardButton).toBeInTheDocument();
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
      const voiceButton = screen.getByRole('button', { name: /音声入力を開始/i });
      expect(voiceButton).toBeInTheDocument();
    });

    it('shows voice status as ready', () => {
      render(<App />);
      const readyStatuses = screen.getAllByText('Ready');
      expect(readyStatuses.length).toBeGreaterThan(0);
    });
  });

  describe('localStorage persistence', () => {
    it('saves messages to localStorage', async () => {
      render(<App />);
      const textarea = screen.getByPlaceholderText(/現在の状況や未来の希望を入力/);
      await userEvent.type(textarea, 'テストメッセージ');

      const sendButton = screen.getByRole('button', { name: /メッセージを送信/i });
      await userEvent.click(sendButton);

      expect(localStorageMock.setItem).toHaveBeenCalled();
    });
  });
});
