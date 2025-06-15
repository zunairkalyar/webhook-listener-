
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Webhook, CapturedResponseItem, InstantResponseType } from './types';
import { APP_TITLE, APP_SUBTITLE, DEFAULT_WEBHOOK_NAME, CALLBACK_URL_PATH, TEST_EVENT_PAYLOADS, DEFAULT_INSTANT_RESPONSE, TestEventType, DEFAULT_BACKEND_URL } from './constants';
import { WebhookIcon, CopyIcon, ChevronDownIcon, CheckCircleIcon, XMarkIcon, BoltIcon, InformationCircleIcon, SpeakerWaveIcon, TrashIcon, ArrowPathIcon } from './components/icons';
import { Modal } from './components/Modal';
import { JsonViewer } from './components/JsonViewer';
import { Tooltip } from './components/Tooltip';

const LOCAL_STORAGE_BACKEND_URL_KEY = 'shopifyWebhookViewer_backendUrl';

type ConnectionStatus = 'Disconnected' | 'Connecting...' | 'Connected' | 'Error';

const App: React.FC = () => {
  const initialWebhookId = 'default-webhook';
  const [webhooks, setWebhooks] = useState<Webhook[]>([{ id: initialWebhookId, name: DEFAULT_WEBHOOK_NAME }]);
  const [selectedWebhookId, setSelectedWebhookId] = useState<string>(initialWebhookId);
  
  const [userBackendUrl, setUserBackendUrl] = useState<string>(() => {
    return localStorage.getItem(LOCAL_STORAGE_BACKEND_URL_KEY) || DEFAULT_BACKEND_URL;
  });
  const [callbackUrl, setCallbackUrl] = useState<string>('');
  
  const [capturedResponses, setCapturedResponses] = useState<CapturedResponseItem[]>([]);
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newWebhookName, setNewWebhookName] = useState<string>(DEFAULT_WEBHOOK_NAME);
  
  const [isDeleteConfirmModalOpen, setIsDeleteConfirmModalOpen] = useState<boolean>(false);
  const [webhookToDelete, setWebhookToDelete] = useState<Webhook | null>(null);

  const [isTestRunModalOpen, setIsTestRunModalOpen] = useState<boolean>(false);
  const [selectedTestEventType, setSelectedTestEventType] = useState<TestEventType>(TestEventType.ORDER_CREATED);

  const [copied, setCopied] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [instantResponseType, setInstantResponseType] = useState<InstantResponseType>(InstantResponseType.DEFAULT);
  const [customResponse, setCustomResponse] = useState<string>(JSON.stringify(DEFAULT_INSTANT_RESPONSE, null, 2));
  
  const socketRef = useRef<Socket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('Disconnected');
  const [isAttemptingConnection, setIsAttemptingConnection] = useState<boolean>(false);

  useEffect(() => {
    try {
      const parsedUrl = new URL(userBackendUrl);
      setCallbackUrl(`${parsedUrl.origin}${CALLBACK_URL_PATH}`);
    } catch (e) {
      setCallbackUrl(`INVALID_BACKEND_URL${CALLBACK_URL_PATH}`);
      console.warn("Invalid backend URL provided for callback generation:", userBackendUrl);
    }
  }, [userBackendUrl]);
  
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_BACKEND_URL_KEY, userBackendUrl);
  }, [userBackendUrl]);


  const connectSocket = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) return;

    if (!userBackendUrl || userBackendUrl === 'INVALID_BACKEND_URL' || !isValidHttpUrl(userBackendUrl)) {
        console.error('Cannot connect: Backend URL is not set or invalid.');
        setConnectionStatus('Error');
        alert("Please set a valid Backend URL before connecting.");
        return;
    }
    
    console.log(`Attempting to connect to WebSocket server at ${userBackendUrl}...`);
    setConnectionStatus('Connecting...');
    setIsAttemptingConnection(true);

    if (socketRef.current) {
        socketRef.current.disconnect();
    }

    const newSocket = io(userBackendUrl, {
      reconnectionAttempts: 3,
      timeout: 10000, 
      transports: ['websocket'] 
    });

    newSocket.on('connect', () => {
      console.log('Connected to WebSocket server:', newSocket.id);
      setConnectionStatus('Connected');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      setConnectionStatus('Disconnected');
    });

    newSocket.on('connect_error', (error) => {
      console.error(`WebSocket connection error to ${userBackendUrl}:`, error.message);
      setConnectionStatus('Error');
    });

    newSocket.on('newWebhookData', (data: CapturedResponseItem | any) => {
      console.log('Received webhook data:', data);
      const newItem: CapturedResponseItem = {
        id: data.id || `event-${Date.now()}`,
        timestamp: data.timestamp || new Date().toISOString(),
        data: data.data || data,
      };
      setCapturedResponses(prev => [newItem, ...prev].slice(0, 50));
    });
    
    newSocket.on('connectionStatus', (statusMsg: { status: string, id?: string }) => {
        console.log("Server status:", statusMsg);
    });

    socketRef.current = newSocket;
  }, [userBackendUrl]); 

  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Disconnecting from WebSocket server...');
      socketRef.current.disconnect();
      setConnectionStatus('Disconnected');
      setIsAttemptingConnection(false);
    }
  }, []);

  const handleToggleListen = () => {
    if (connectionStatus === 'Connected' || connectionStatus === 'Connecting...') {
      disconnectSocket();
    } else {
      connectSocket();
    }
  };
  
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);


  const handleAddWebhook = () => {
    if (newWebhookName.trim() === '') return;
    const newWebhook: Webhook = { id: Date.now().toString(), name: newWebhookName.trim() };
    setWebhooks(prev => [...prev, newWebhook]);
    setSelectedWebhookId(newWebhook.id);
    setNewWebhookName(DEFAULT_WEBHOOK_NAME);
    setIsCreateModalOpen(false);
  };

  const openDeleteConfirmModal = (webhook: Webhook) => {
    if (webhooks.length <= 1) return;
    setWebhookToDelete(webhook);
    setIsDeleteConfirmModalOpen(true);
  };

  const handleDeleteWebhook = () => {
    if (!webhookToDelete) return;
    setWebhooks(prev => {
      const remaining = prev.filter(wh => wh.id !== webhookToDelete.id);
      if (remaining.length === 0) {
        const defaultWh = { id: `default-${Date.now()}`, name: DEFAULT_WEBHOOK_NAME };
        setSelectedWebhookId(defaultWh.id);
        return [defaultWh];
      }
      if (selectedWebhookId === webhookToDelete.id) {
        setSelectedWebhookId(remaining[0].id);
      }
      return remaining;
    });
    setIsDeleteConfirmModalOpen(false);
    setWebhookToDelete(null);
  };
  
  const selectedWebhook = webhooks.find(wh => wh.id === selectedWebhookId) || webhooks[0] || { id: 'fallback', name: 'Default' };


  const handleCopyUrl = () => {
    if (callbackUrl.startsWith('INVALID_BACKEND_URL')) {
        alert("Cannot copy: Backend URL is invalid. Please set a valid Backend URL first.");
        return;
    }
    navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
        alert("Failed to copy URL. Ensure you are on HTTPS or localhost.");
        console.error("Failed to copy URL:", err);
    });
  };
  
  const handleSaveConfiguration = () => {
    setIsSaved(true);
    console.log("Configuration saved (simulated):", {
      selectedWebhookName: selectedWebhook?.name,
      instantResponseType,
      customResponse: instantResponseType === InstantResponseType.CUSTOM ? customResponse : null,
      backendTarget: userBackendUrl,
    });
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleTriggerTestRun = () => {
    const payload = TEST_EVENT_PAYLOADS[selectedTestEventType];
    setCapturedResponses(prev => [
      { 
        id: `local-test-${Date.now()}`, 
        timestamp: new Date().toISOString(), 
        data: { ...payload, event_source: "local_manual_test_run", received_at: new Date().toLocaleTimeString() } 
      }, 
      ...prev
    ].slice(0, 50));
    setIsTestRunModalOpen(false);
  };

  const handleClearResponses = () => {
    setCapturedResponses([]);
  };

  const listenButtonText = () => {
    switch (connectionStatus) {
      case 'Connected':
        return 'Disconnect from Backend';
      case 'Connecting...':
        return 'Connecting...';
      case 'Error':
        return 'Retry Connection';
      case 'Disconnected':
      default:
        return 'Connect to Backend';
    }
  };
  
  const listenButtonClass = () => {
     switch (connectionStatus) {
      case 'Connected':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'Connecting...':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black animate-pulse';
       case 'Error':
        return 'bg-orange-700 hover:bg-orange-800 text-white';
      case 'Disconnected':
      default:
        return 'bg-green-600 hover:bg-green-700 text-white';
    }
  }
  
  const isValidHttpUrl = (string: string) => {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;  
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }


  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center space-x-3">
          <WebhookIcon className="w-10 h-10 text-orange-500" />
          <div>
            <h1 className="text-2xl font-semibold text-slate-50">{APP_TITLE}</h1>
            <p className="text-sm text-slate-400">{APP_SUBTITLE}</p>
          </div>
          <div className="flex-grow text-right">
            <span className={`text-xs px-2 py-1 rounded-full ${
              connectionStatus === 'Connected' ? 'bg-green-600/80' : 
              connectionStatus === 'Connecting...' ? 'bg-yellow-500/80 text-black' : 
              connectionStatus === 'Error' ? 'bg-red-600/80' : 'bg-slate-700/80'
            }`}>
              Backend: {connectionStatus}
            </span>
          </div>
        </div>
        
        {/* Backend URL Configuration */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <label htmlFor="backend-url" className="block text-sm font-medium text-slate-300 mb-1">Your Backend Server URL</label>
            <input
              id="backend-url"
              type="text"
              value={userBackendUrl}
              onChange={(e) => setUserBackendUrl(e.target.value)}
              placeholder="e.g., https://your-ngrok-url.io or http://localhost:3001"
              className={`w-full bg-slate-700 border text-slate-100 text-sm rounded-md p-2.5 focus:ring-orange-500 focus:border-orange-500 ${!isValidHttpUrl(userBackendUrl) && userBackendUrl ? 'border-red-500' : 'border-slate-600'}`}
            />
            {!isValidHttpUrl(userBackendUrl) && userBackendUrl && (
                <p className="text-xs text-red-400 mt-1">Please enter a valid HTTP/HTTPS URL.</p>
            )}
            <p className="text-xs text-slate-400 mt-2">
                Enter the base URL of your running backend server (which includes the WebSocket server).
                This is where the frontend will attempt to connect. Example: <code>http://localhost:3001</code> for local, or your public <code>ngrok</code> / <code>Render</code> URL.
            </p>
        </div>


        {/* Webhook Selector & Actions */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <label htmlFor="webhook-select" className="block text-sm font-medium text-slate-300 mb-1">Webhook Profile</label>
          <div className="flex space-x-2 items-center">
            <div className="relative flex-grow">
              <select
                id="webhook-select"
                value={selectedWebhookId}
                onChange={(e) => setSelectedWebhookId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-md p-2.5 pr-10 focus:ring-orange-500 focus:border-orange-500 appearance-none"
              >
                {webhooks.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
              <ChevronDownIcon className="w-5 h-5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <Tooltip text="Add New Webhook Profile" position="top">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-md text-sm font-medium transition-colors border border-slate-600"
                aria-label="Add New Webhook Profile"
              >
                Add Webhook
              </button>
            </Tooltip>
             {selectedWebhook && (
              <Tooltip text="Delete Selected Webhook Profile" position="top">
                <button
                  onClick={() => selectedWebhook && openDeleteConfirmModal(selectedWebhook)}
                  disabled={webhooks.length <= 1}
                  className="p-2.5 bg-red-700 hover:bg-red-600 text-slate-100 rounded-md transition-colors border border-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Delete Selected Webhook Profile"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Callback URL Display */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <label htmlFor="callback-url-display" className="block text-sm font-medium text-slate-300 mb-1">Your Target Callback URL (for Shopify)</label>
          <div className="flex items-center space-x-2">
            <input
              id="callback-url-display"
              type="text"
              readOnly
              value={callbackUrl.startsWith('INVALID_BACKEND_URL') ? 'Invalid Backend URL provided above' : callbackUrl}
              className={`w-full bg-slate-700 border text-sm rounded-md p-2.5 focus:ring-orange-500 focus:border-orange-500 ${callbackUrl.startsWith('INVALID_BACKEND_URL') ? 'text-red-400 border-red-500' : 'text-slate-300 border-slate-600'}`}
            />
            <Tooltip text={copied ? "Copied!" : "Copy URL"} position="top">
              <button
                onClick={handleCopyUrl}
                disabled={callbackUrl.startsWith('INVALID_BACKEND_URL')}
                className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-orange-400 rounded-md transition-colors border border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Copy callback URL"
              >
                <CopyIcon className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
           <p className="text-xs text-slate-400 mt-2">
            This is the full URL to paste into your Shopify webhook configuration. It's derived from your Backend Server URL above.
            Example: if backend is <code>https://my-app.ngrok.io</code>, callback will be <code>https://my-app.ngrok.io{CALLBACK_URL_PATH}</code>.
           </p>
        </div>

        {/* Connecting to Shopify: Setup Guide */}
        <div className="bg-blue-900/30 border border-blue-700 p-6 rounded-lg shadow-lg space-y-3">
            <h3 className="text-lg font-semibold text-blue-300 mb-2 flex items-center">
                <InformationCircleIcon className="w-6 h-6 mr-2 text-blue-400"/>
                Connecting to Shopify: Setup Guide
            </h3>
            <p className="text-sm text-blue-200">To receive actual webhooks from Shopify, follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
                <li>
                    <strong>Run Your Backend:</strong> Ensure your backend server (target for the 'Your Backend Server URL' field above) is running and publicly accessible. For local development, use <a href="https://ngrok.com/" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">ngrok</a>. For production, deploy it (e.g., Render, Railway).
                </li>
                <li>
                    <strong>Shopify Webhook Setup:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-400">
                        <li>Log in to your Shopify Admin or Partner Dashboard.</li>
                        <li>Navigate to: <strong>Settings &gt; Notifications &gt; Webhooks</strong> (for store webhooks) OR your <strong>App Setup &gt; Webhooks</strong> (for apps).</li>
                        <li>Click <strong>'Create webhook'</strong>.</li>
                        <li><strong>Event:</strong> Choose the Shopify event (e.g., 'Order creation').</li>
                        <li><strong>Format:</strong> Select <strong>JSON</strong>.</li>
                        <li><strong>URL:</strong> Paste the <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">{callbackUrl.startsWith('INVALID_BACKEND_URL') ? 'your valid callback URL' : callbackUrl}</code> from this application.</li>
                        <li><strong>Webhook API version:</strong> Select the latest stable version.</li>
                        <li>Click <strong>'Save webhook'</strong>.</li>
                    </ul>
                </li>
                <li>
                    <strong>HMAC Signing Secret:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-400">
                        <li>After saving, Shopify will show a <strong>Signing secret</strong> (e.g., <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">shpss_...</code>). <strong className="text-orange-300">Copy this secret.</strong></li>
                        <li>Your backend server <strong className="text-orange-300">MUST</strong> use this secret to verify the <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">X-Shopify-Hmac-SHA256</code> header on incoming webhooks. This is critical for security.</li>
                        <li>The conceptual backend code provided earlier includes HMAC verification. Configure it with this secret (usually via an environment variable like <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">SHOPIFY_SHARED_SECRET</code>).</li>
                    </ul>
                </li>
                <li>
                    <strong>Start Listening & Test:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-400">
                        <li>Once your backend is running with the correct secret and Shopify is configured with the callback URL, click the <strong className="text-green-400">'{listenButtonText()}'</strong> button in this application.</li>
                        <li>Trigger the event in Shopify (e.g., create a test order). The data should then appear in the 'Captured Responses' section below.</li>
                    </ul>
                </li>
            </ol>
        </div>
        
        {/* Listen Button & Info Notes */}
        <div className="space-y-4">
            <button
                onClick={handleToggleListen}
                disabled={connectionStatus === 'Connecting...' || !isValidHttpUrl(userBackendUrl)}
                className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-md text-base font-semibold transition-all duration-150 ease-in-out shadow-md transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${listenButtonClass()}`}
            >
                <SpeakerWaveIcon className={`w-5 h-5 ${connectionStatus === 'Connected' ? 'animate-pulse' : ''}`} />
                <span>{listenButtonText()}</span>
            </button>
            <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 px-4 py-3 rounded-md text-sm flex items-start space-x-2" role="alert">
                <InformationCircleIcon className="w-5 h-5 flex-shrink-0 mt-0.5 text-yellow-400" />
                <div>
                {!isValidHttpUrl(userBackendUrl) && 
                    `Please enter a valid HTTP/HTTPS Backend Server URL above to enable connection.`
                }
                {isValidHttpUrl(userBackendUrl) && connectionStatus !== 'Connected' && 
                    `Click "${listenButtonText()}" to connect to your backend at ${userBackendUrl} and receive real-time Shopify webhooks. Ensure your backend is running and publicly accessible.`
                }
                {isValidHttpUrl(userBackendUrl) && connectionStatus === 'Connected' &&
                    `Connected to backend at ${userBackendUrl}. Actively listening for Shopify webhooks. Captured responses will appear below. Click "Disconnect" to stop.`
                }
                </div>
            </div>
            <div className="bg-slate-800/50 border border-slate-700 text-slate-300 px-4 py-3 rounded-md text-sm" role="alert">
                <p className="font-semibold mb-1 text-orange-400">Security Requirement:</p>
                <p>Your backend server at <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">{callbackUrl.startsWith('INVALID_BACKEND_URL') ? 'your configured callback URL' : callbackUrl}</code> <strong className="text-orange-300">MUST</strong> verify the <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">X-Shopify-Hmac-SHA256</code> header from Shopify using your app's shared secret. The provided conceptual backend code includes this critical step.</p>
            </div>
        </div>

        {/* Captured Response */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-slate-100">Captured Responses ({capturedResponses.length})</h3>
            {capturedResponses.length > 0 && (
              <Tooltip text="Clear All Captured Responses" position="left">
                <button
                  onClick={handleClearResponses}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-red-400 rounded-md text-sm transition-colors border border-slate-600 flex items-center space-x-1.5"
                  aria-label="Clear all captured responses"
                >
                  <ArrowPathIcon className="w-4 h-4" /> 
                  <span>Clear</span>
                </button>
              </Tooltip>
            )}
          </div>
          {capturedResponses.length > 0 ? (
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 json-viewer">
              {capturedResponses.map(response => (
                <div key={response.id} className="bg-slate-850 p-4 rounded-md shadow">
                  <p className="text-xs text-slate-400 mb-2">
                    Received: {new Date(response.timestamp).toLocaleString()} 
                    {response.data?.event_source === "local_manual_test_run" && ` (Local Test: ${response.data.event_type || 'N/A'})`}
                    {response.data?.source === "shopify_webhook" && ` (From Shopify: ${response.data.topic || 'N/A'})`}
                  </p>
                  <JsonViewer data={response.data} maxHeight="300px" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">
              {connectionStatus === 'Connected' ? "Waiting for incoming webhook data from your backend..." : `No responses captured yet. Configure your backend URL, connect, or use "Test Run" for a local simulation.`}
            </p>
          )}
        </div>

        {/* Instant Webhook Response Configuration */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
          <h3 className="text-lg font-semibold text-slate-100 mb-3">Instant Webhook Response (Guidance)</h3>
          <p className="text-sm text-slate-400 mb-4">This section is for guidance. Your actual backend (e.g., at <code className="bg-slate-700 px-1 py-0.5 rounded text-xs">{callbackUrl.startsWith('INVALID_BACKEND_URL') ? 'your callback URL' : callbackUrl}</code>) must be configured to send the appropriate HTTP 200 OK response to Shopify *after* HMAC verification and processing.</p>
          <div className="flex border-b border-slate-700 mb-4">
            {(Object.values(InstantResponseType) as Array<InstantResponseType>).map(type => (
              <button
                key={type}
                onClick={() => setInstantResponseType(type)}
                className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium transition-colors
                  ${instantResponseType === type 
                    ? 'border-orange-500 text-orange-400' 
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-500'}`}
              >
                {type}
              </button>
            ))}
          </div>
          <div>
            {instantResponseType === InstantResponseType.DEFAULT && ( <JsonViewer data={DEFAULT_INSTANT_RESPONSE} /> )}
            {instantResponseType === InstantResponseType.CUSTOM && (
              <div>
                <textarea
                  value={customResponse}
                  onChange={(e) => setCustomResponse(e.target.value)}
                  rows={8}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-md p-3 focus:ring-orange-500 focus:border-orange-500 font-mono"
                  placeholder="Enter valid JSON for backend to return (guidance only)"
                  aria-label="Custom JSON Response (Guidance)"
                />
                {(() => {
                  try {
                    JSON.parse(customResponse);
                    return <p className="text-xs text-green-400 mt-1">Valid JSON example</p>;
                  } catch (e) {
                    return <p className="text-xs text-red-400 mt-1">Invalid JSON example: {(e as Error).message}</p>;
                  }
                })()}
              </div>
            )}
            {instantResponseType === InstantResponseType.DISABLE && (
              <p className="text-slate-400 p-4 bg-slate-700 rounded-md text-sm">
                If your backend sends no response or an error, Shopify will retry. It expects a 2xx status code.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-700">
          {isSaved && (
            <span className="text-sm text-green-400 flex items-center transition-opacity duration-500 ease-in-out">
              <CheckCircleIcon className="w-5 h-5 mr-1" /> Config Saved (Simulated)
            </span>
          )}
          <button
            onClick={handleSaveConfiguration}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Save Configuration (Simulated)
          </button>
          <button
            onClick={() => setIsTestRunModalOpen(true)}
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <BoltIcon className="w-4 h-4" />
            <span>Local Test Run...</span>
          </button>
        </div>
      </div>

      {/* Create Webhook Modal */}
      <Modal title="Create a new webhook profile" isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="webhook-name-create" className="block text-sm font-medium text-slate-300 mb-1">Webhook Profile Name</label>
            <input
              type="text"
              id="webhook-name-create"
              value={newWebhookName}
              onChange={(e) => setNewWebhookName(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-md p-2.5 focus:ring-orange-500 focus:border-orange-500"
              placeholder="e.g., Order Fulfillment Hook"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md text-sm font-medium transition-colors">Cancel</button>
            <button type="button" onClick={handleAddWebhook} className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md text-sm font-medium transition-colors">Save Profile</button>
          </div>
        </div>
      </Modal>

      {/* Delete Webhook Confirmation Modal */}
      {webhookToDelete && (
        <Modal title="Delete Webhook Profile" isOpen={isDeleteConfirmModalOpen} onClose={() => setIsDeleteConfirmModalOpen(false)}>
          <div className="space-y-4">
            <p className="text-slate-300">Are you sure you want to delete the profile: <strong className="font-semibold">{webhookToDelete.name}</strong>?</p>
            <div className="flex justify-end space-x-3">
              <button type="button" onClick={() => setIsDeleteConfirmModalOpen(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md text-sm font-medium transition-colors">Cancel</button>
              <button type="button" onClick={handleDeleteWebhook} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors">Delete Profile</button>
            </div>
          </div>
        </Modal>
      )}

      {/* Test Run Event Type Selection Modal */}
      <Modal title="Simulate Shopify Event (Local)" isOpen={isTestRunModalOpen} onClose={() => setIsTestRunModalOpen(false)}>
        <div className="space-y-4">
          <div>
            <label htmlFor="test-event-type" className="block text-sm font-medium text-slate-300 mb-2">Choose an event type to simulate locally:</label>
            <select 
              id="test-event-type"
              value={selectedTestEventType}
              onChange={(e) => setSelectedTestEventType(e.target.value as TestEventType)}
              className="w-full bg-slate-700 border border-slate-600 text-slate-100 text-sm rounded-md p-2.5 focus:ring-orange-500 focus:border-orange-500"
            >
              {Object.values(TestEventType).map(eventType => (
                <option key={eventType} value={eventType}>{eventType}</option>
              ))}
            </select>
          </div>
           <p className="text-xs text-slate-400">This will add a sample payload to the 'Captured Responses' list below. It does not send data to/from a backend.</p>
          <div className="flex justify-end space-x-3">
            <button type="button" onClick={() => setIsTestRunModalOpen(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md text-sm font-medium transition-colors">Cancel</button>
            <button type="button" onClick={handleTriggerTestRun} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-md text-sm font-medium transition-colors">Send Local Test Event</button>
          </div>
        </div>
      </Modal>

    </div>
  );
};

export default App;
