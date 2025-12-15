import { useState, useEffect, useMemo } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider,
  useWallet
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { 
  PhantomWalletAdapter,
  SolflareWalletAdapter
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import bs58 from 'bs58';
import './App.css';

// Import wallet adapter styles
import '@solana/wallet-adapter-react-ui/styles.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

function WalletContent() {
  const { publicKey, signMessage, connected } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAttemptedAuth, setHasAttemptedAuth] = useState(false);

  const handleSignMessage = async () => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected');
      return;
    }

    // Prevent multiple simultaneous attempts
    if (isAuthenticating) {
      console.log('Already authenticating, skipping...');
      return;
    }

    setIsAuthenticating(true);
    setError(null);
    setHasAttemptedAuth(true);

    console.log('🔗 Backend URL:', BACKEND_URL);
    console.log('🔑 Public Key:', publicKey.toBase58());

    try {
      // Step 1: Request message from backend
      const messageResponse = await fetch(
        `${BACKEND_URL}/api/user/auth/request-message/${publicKey.toBase58()}`,
        {
          headers: {
            'ngrok-skip-browser-warning': 'true',
          },
        }
      );
      console.log("isAuthenticated", isAuthenticated);
      console.log('📥 Response status:', messageResponse.status);
      console.log('📥 Response headers:', Object.fromEntries(messageResponse.headers.entries()));

      if (!messageResponse.ok) {
        throw new Error(`Backend returned ${messageResponse.status}: ${messageResponse.statusText}`);
      }

      // Check if response is JSON
      const contentType = messageResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await messageResponse.text();
        console.error('❌ Received non-JSON response:', text.substring(0, 500));
        throw new Error(`Backend returned HTML instead of JSON. Check your backend URL: ${BACKEND_URL}`);
      }

      const messageData = await messageResponse.json();
      console.log('✅ Message data:', messageData);
      
      if (!messageData || !messageData.message) {
        throw new Error('Invalid response format from backend');
      }
      
      const message = messageData.message;

      // Step 2: Sign the message
      const encodedMessage = new TextEncoder().encode(message);
      const signature = await signMessage(encodedMessage);

      // Step 3: Verify signature with backend
      const verifyResponse = await fetch(`${BACKEND_URL}/api/user/auth/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          publicKey: publicKey.toBase58(),
          signature: bs58.encode(signature),
          message: message,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error('Failed to verify signature');
      }

      const verifyData = await verifyResponse.json();
      console.log("verifyData", verifyData);
      if (verifyData.user) {
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.log("token not found");
      console.error('Authentication error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setHasAttemptedAuth(false); // Allow retry on error
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Auto-sign when wallet connects (only once)
  useEffect(() => {
    if (connected && !isAuthenticated && !isAuthenticating && !hasAttemptedAuth) {
      console.log('🚀 Triggering auto-sign...');
      handleSignMessage();
    }
  }, [connected]); // Only depend on connected to prevent loops

  const handleTwitterAuth = () => {
    // Redirect to Twitter OAuth endpoint
    window.location.href = `${BACKEND_URL}/api/user/auth/twitter/${publicKey?.toBase58()}`;
  };

  return (
    <div className="app-container">
      <div className="content-card">
        <h1>Raffle Authentication</h1>
        
        <div className="debug-info">
          <small>Backend: {BACKEND_URL}</small>
        </div>
        
        <div className="wallet-section">
          <WalletMultiButton />
        </div>

        {connected && !isAuthenticated && (
          <div className="status-section">
            {isAuthenticating ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Authenticating with wallet...</p>
              </div>
            ) : (
              <button 
                onClick={handleSignMessage}
                className="auth-button"
              >
                Sign Message to Authenticate
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
            <button onClick={handleSignMessage}>Retry</button>
          </div>
        )}

        {isAuthenticated && (
          <div className="authenticated-section">
            <div className="success-message">
              <svg className="checkmark" viewBox="0 0 52 52">
                <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
              <h2>Wallet Authenticated!</h2>
              <p className="wallet-address">{publicKey?.toBase58()}</p>
            </div>

            <button 
              onClick={handleTwitterAuth}
              className="twitter-button"
            >
              <svg viewBox="0 0 24 24" className="twitter-icon">
                <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Connect Twitter
            </button>
          </div>
        )}

        {!connected && (
          <div className="info-section">
            <p>Connect your Solana wallet to get started</p>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  // Configure Solana network (mainnet-beta, devnet, or testnet)
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App;
