import React, { useState, useRef, useCallback, useEffect, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageLayerData } from './types';
import { fileToBase64, drawLayersOnCanvas } from './utils/imageUtils';
import LayerSidebar from './components/LayerSidebar';
import ImageLayer from './components/ImageLayer';
import HamburgerMenu from './components/HamburgerMenu';
import AuthScreen from './components/AuthScreen';
import ProfileScreen from './screens/ProfileScreen';
import ShopScreen from './screens/ShopScreen';
import AdminPanel from './screens/AdminPanel';
import FreeDrawCanvas from './screens/FreeDrawCanvas';
import HistoryScreen from './screens/HistoryScreen';
import ChatScreen from './screens/ChatScreen';
import ResolutionSelector from './components/ResolutionSelector';
import ImageCompareSlider from './components/ImageCompareSlider';
import { getCostForResolution, saveToLocalStorage, getFromLocalStorage, DEFAULT_USER, VIP_TIERS } from './utils/appUtils'; // Giữ lại tiện ích frontend
import { User } from './db/schema'; // Import User schema from db/schema
import * as authService from './services/auth'; // Import auth service
import * as userService from './services/user'; // Import user service


// Reducer for Undo/Redo
interface HistoryState {
  past: ImageLayerData[][];
  present: ImageLayerData[];
  future: ImageLayerData[][];
}

type HistoryAction =
  | { type: 'SET'; newPresent: ImageLayerData[] }
  | { type: 'UNDO' }
  | { type: 'REDO' };

const historyReducer = (state: HistoryState, action: HistoryAction): HistoryState => {
  const { past, present, future } = state;

  switch (action.type) {
    case 'SET':
      if (action.newPresent === present) return state; // No change
      return {
        past: [...past, present],
        present: action.newPresent,
        future: [],
      };
    case 'UNDO':
      if (past.length === 0) return state;
      const previous = past[past.length - 1];
      const newPast = past.slice(0, past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [present, ...future],
      };
    case 'REDO':
      if (future.length === 0) return state;
      const next = future[0];
      const newFuture = future.slice(1);
      return {
        past: [...past, present],
        present: next,
        future: newFuture,
      };
    default:
      return state;
  }
};


const App: React.FC = () => {
  const [historyState, dispatch] = useReducer(historyReducer, {
    past: [],
    present: [],
    future: [],
  });
  const layers = historyState.present;
  const setLayers = useCallback((newLayers: ImageLayerData[]) => {
    dispatch({ type: 'SET', newPresent: newLayers });
  }, []);

  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; isError: boolean } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('auth'); // 'auth', 'editor', 'profile', 'shop', 'admin-panel', 'free-draw', 'history', 'chat', 'forgot-password', 'vip'
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [selectedResolution, setSelectedResolution] = useState<string>(getFromLocalStorage('lastResolution', 'cao'));
  const [showCompareSlider, setShowCompareSlider] = useState(false);
  const [beforeCompareImage, setBeforeCompareImage] = useState<string | null>(null);


  const canvasEditorRef = useRef<HTMLDivElement>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editorDimensions, setEditorDimensions] = useState({ width: 0, height: 0 });

  // Update editor dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (canvasEditorRef.current) {
        setEditorDimensions({
          width: canvasEditorRef.current.offsetWidth,
          height: canvasEditorRef.current.offsetHeight,
        });
      }
    };
    updateDimensions(); // Initial dimensions
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Toast message handler
  // Removed handleShowMessage from its own dependency array to prevent circular reference.
  const handleShowMessage = useCallback((message: string, isError: boolean) => {
    setToastMessage({ message, isError });
    const timer = setTimeout(() => setToastMessage(null), 3000); // Hide after 3 seconds
    return () => clearTimeout(timer);
  }, []);

  // Authentication & Daily Stars
  useEffect(() => {
    const loadInitialUser = async () => {
      const rememberedUser = getFromLocalStorage('rememberedUser', null);
      let userFromLocal: User | null = getFromLocalStorage('currentUser', null); // User from previous session

      let authenticatedUser: User | null = null;
      let authToken: string | null = getFromLocalStorage('authToken', null);

      if (authToken && userFromLocal) {
        // Try to re-fetch user data with existing token (validate token implicitly on backend)
        try {
          const fetchedUser = await userService.fetchCurrentUser(userFromLocal.id);
          if (fetchedUser) {
            authenticatedUser = fetchedUser;
          } else {
            // Token might be invalid or expired, clear it
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            localStorage.removeItem('rememberedUser');
            handleShowMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', true);
          }
        } catch (err) {
          console.error('Error re-authenticating:', err);
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          localStorage.removeItem('rememberedUser');
          handleShowMessage('Lỗi xác thực. Vui lòng đăng nhập lại.', true);
        }
      } else if (rememberedUser && rememberedUser.username && rememberedUser.password) {
        // If no active session, try to log in with remembered credentials
        try {
          authenticatedUser = await authService.login(rememberedUser.username, rememberedUser.password);
          if (authenticatedUser) {
            // Token is now saved by authService.login
            saveToLocalStorage('currentUser', authenticatedUser);
          } else {
            localStorage.removeItem('rememberedUser');
          }
        } catch (err: any) {
          console.error('Error logging in with remembered credentials:', err.message);
          localStorage.removeItem('rememberedUser');
        }
      }

      if (authenticatedUser) {
        setCurrentUser(authenticatedUser);
        if (authenticatedUser.role === 'ADMIN') {
          setIsAdminMode(true);
        }
        setCurrentScreen('editor');
        handleShowMessage(`Chào mừng trở lại, ${authenticatedUser.username}!`, false);
      } else {
        setCurrentUser(null);
        setIsAdminMode(false);
        setCurrentScreen('auth');
      }
    };
    loadInitialUser();
  }, [handleShowMessage]);

  // Daily stars effect
  useEffect(() => {
    if (currentUser && currentScreen === 'editor' && currentUser.id) {
      const checkAndAddDailyStars = async () => {
        try {
          const updatedUser = await userService.addDailyStars(currentUser.id);
          if (updatedUser) {
            // Only show message if stars were actually added (not just re-fetched same day)
            const today = new Date().toISOString().split('T')[0];
            if (new Date(updatedUser.dailyStarClaimed).toISOString().split('T')[0] === today && new Date(currentUser.dailyStarClaimed).toISOString().split('T')[0] !== today) {
              const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;
              const starsToAddMatch = userRoleData.benefits.find(b => b.includes('sao miễn phí mỗi ngày'))?.match(/\+(\d+) sao miễn phí mỗi ngày/);
              const starsAdded = starsToAddMatch ? starsToAddMatch[1] : '30';
              handleShowMessage(`Bạn đã nhận +${starsAdded} sao miễn phí hôm nay!`, false);
            }
            setCurrentUser(updatedUser); // Update state with latest user data from backend
            saveToLocalStorage('currentUser', updatedUser); // Persist updated user
          }
        } catch (err) {
          console.error('Error claiming daily stars:', err);
          // Don't show an error message if it's just "already claimed"
        }
      };
      checkAndAddDailyStars();
    }
  }, [currentUser?.id, currentUser?.dailyStarClaimed, currentScreen, handleShowMessage, currentUser?.role]);


  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    if (user.role === 'ADMIN') {
      setIsAdminMode(true);
    }
    setCurrentScreen('editor');
    handleShowMessage(`Chào mừng ${user.username}!`, false);
  }, [handleShowMessage]);

  const handleAdminLogin = useCallback((user: User) => {
    setCurrentUser(user);
    setIsAdminMode(true);
    setCurrentScreen('admin-panel'); // Directly to admin panel for admin
    handleShowMessage(`Chào mừng Admin ${user.username}!`, false);
  }, [handleShowMessage]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('authToken'); // Clear JWT token
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberedUser');
    setCurrentUser(null);
    setIsAdminMode(false);
    setCurrentScreen('auth');
    setLayers([]); // Clear layers on logout
    handleShowMessage('Bạn đã đăng xuất.', false);
  }, [handleShowMessage, setLayers]);

  // Callback to update currentUser state from child components (Profile, Admin, Shop)
  const handleUpdateCurrentUser = useCallback((user: User) => {
    setCurrentUser(user);
    saveToLocalStorage('currentUser', user); // Persist updated user to localStorage
  }, []);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) {
      handleShowMessage('Vui lòng đăng nhập để tải ảnh lên.', true);
      setLoading(false);
      return;
    }

    // Fix: Cast event.target.files to FileList and then to an array of File
    const files = Array.from(event.target.files || []) as File[];
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    const newLayers: ImageLayerData[] = [];

    for (const file of files) {
      // Fix: file is already typed as File from the Array.from cast
      if (!file.type.startsWith('image/')) {
        setError('Chỉ cho phép tệp hình ảnh.');
        setLoading(false);
        return;
      }

      try {
        // Fix: file is already typed as File
        const base64 = await fileToBase64(file);
        const img = new Image();
        img.src = base64;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const initialWidth = Math.min(img.width, editorDimensions.width * 0.5);
        const initialHeight = (img.height / img.width) * initialWidth;

        newLayers.push({
          id: uuidv4(),
          src: base64,
          name: file.name, // Fix: file is already typed as File
          x: (editorDimensions.width - initialWidth) / 2,
          y: (editorDimensions.height - initialHeight) / 2,
          width: initialWidth,
          height: initialHeight,
          rotation: 0,
          zIndex: layers.length + newLayers.length,
          opacity: 1,
        });
      } catch (err) {
        // Fix: file is already typed as File
        console.error('Lỗi khi xử lý tệp:', file.name, err);
        setError(`Không thể tải ảnh ${file.name}.`); // Fix: file is already typed as File
      }
    }

    setLayers([...layers, ...newLayers].map((layer, index) => ({ ...layer, zIndex: index })));
    setSelectedLayerId(newLayers.length > 0 ? newLayers[newLayers.length - 1].id : null);
    setLoading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [layers, editorDimensions, currentUser, handleShowMessage, setLayers]);

  const handleUpdateLayer = useCallback((id: string, updates: Partial<ImageLayerData>) => {
    const newLayers = layers.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer));
    setLayers(newLayers);
  }, [layers, setLayers]);

  const handleDeleteLayer = useCallback((id: string) => {
    const newLayers = layers.filter((layer) => layer.id !== id);
    setLayers(newLayers);
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  }, [layers, selectedLayerId, setLayers]);

  const handleLayerOrderChange = useCallback((id: string, direction: 'up' | 'down') => {
    const currentLayers = [...layers];
    const currentLayerIndex = currentLayers.findIndex((layer) => layer.id === id);
    if (currentLayerIndex === -1) return;

    const currentLayer = currentLayers[currentLayerIndex];
    let newZIndex = currentLayer.zIndex;
    if (direction === 'up') {
      newZIndex = Math.min(currentLayers.length - 1, currentLayer.zIndex + 1);
    } else {
      newZIndex = Math.max(0, currentLayer.zIndex - 1);
    }

    const layersWithTempZIndex = currentLayers.map(layer =>
      layer.id === id ? { ...layer, zIndex: newZIndex } : layer
    );

    const sortedAndNormalizedLayers = layersWithTempZIndex
      .sort((a, b) => a.zIndex - b.zIndex)
      .map((layer, index) => ({ ...layer, zIndex: index }));

    setLayers(sortedAndNormalizedLayers);
  }, [layers, setLayers]);


  const handleClearAllLayers = useCallback(() => {
    setLayers([]);
    setSelectedLayerId(null);
  }, [setLayers]);

  const handleDownload = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      handleShowMessage('Vui lòng đăng nhập để tải ảnh.', true);
      return;
    }
    const cost = getCostForResolution(selectedResolution);

    let updatedUserAfterDeduct: User | null = null;
    try {
        updatedUserAfterDeduct = await userService.deductStars(currentUser.id, cost);
    } catch (err: any) {
        if (err.message.includes('Insufficient stars')) {
            handleShowMessage(`Không đủ sao để tải ảnh độ phân giải ${selectedResolution.toUpperCase()}. Cần ${cost} sao.`, true);
            return;
        }
        handleShowMessage(`Lỗi khi trừ sao: ${err.message}`, true);
        return;
    }

    if (!updatedUserAfterDeduct) { // Should not happen if deductStars throws on insufficient
        handleShowMessage('Lỗi không xác định khi trừ sao.', true);
        return;
    }

    setLoading(true);
    setToastMessage(null);
    let downloadWidth = editorDimensions.width;
    let downloadHeight = editorDimensions.height;

    // Adjust dimensions based on selected resolution, maintaining aspect ratio
    const aspectRatio = editorDimensions.width / editorDimensions.height;
    switch (selectedResolution) {
      case '1K': downloadWidth = 1920; downloadHeight = 1920 / aspectRatio; break;
      case '2K': downloadWidth = 2560; downloadHeight = 2560 / aspectRatio; break;
      case '4K': downloadWidth = 3840; downloadHeight = 3840 / aspectRatio; break;
      case 'thap': downloadWidth = 640; downloadHeight = 640 / aspectRatio; break; // Example SD
      case 'trungBinh': downloadWidth = 1280; downloadHeight = 1280 / aspectRatio; break; // Example HD
      case 'cao': // Full HD, use editor native or a bit higher
        downloadWidth = 1920; downloadHeight = 1920 / aspectRatio;
        if (editorDimensions.width < 1920) { // If editor is smaller, scale up
          downloadWidth = 1920;
          downloadHeight = 1920 / aspectRatio;
        } else { // If editor is larger, use editor size
          downloadWidth = editorDimensions.width;
          downloadHeight = editorDimensions.height;
        }
        break;
      default: break;
    }

    try {
      const canvas = await drawLayersOnCanvas(layers, exportCanvasRef, downloadWidth, downloadHeight);
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `separate-clothes_${selectedResolution.toUpperCase()}_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      handleShowMessage('Ảnh đã tải xuống thành công!', false);

      // Add to history via service
      const updatedUserAfterHistory = await userService.addImageToHistory(updatedUserAfterDeduct.id, {
        thumbnailUrl: image,
        originalPrompt: `Generated at ${selectedResolution.toUpperCase()}`, // Placeholder prompt
        processedAt: Date.now(), // Use number directly for timestamp
        resolutionUsed: selectedResolution,
        costStars: cost,
      });
      if (updatedUserAfterHistory) {
        setCurrentUser(updatedUserAfterHistory); // Update stars and history
        saveToLocalStorage('currentUser', updatedUserAfterHistory); // Persist
      }
    } catch (err: any) {
      console.error('Lỗi khi tải xuống ảnh hoặc thêm vào lịch sử:', err);
      setError(`Không thể tải xuống ảnh hoặc thêm vào lịch sử: ${err.message}. Vui lòng thử lại.`);
    } finally {
      setLoading(false);
    }
  }, [layers, editorDimensions, currentUser, selectedResolution, handleShowMessage, setLayers]);

  const handleAddLayerFromDrawing = useCallback((src: string, name: string) => {
    const initialWidth = Math.min(editorDimensions.width * 0.5, 500); // Default size for drawn layer
    const initialHeight = initialWidth; // Assuming square for simplicity
    const newLayer: ImageLayerData = {
      id: uuidv4(),
      src: src,
      name: name,
      x: (editorDimensions.width - initialWidth) / 2,
      y: (editorDimensions.height - initialHeight) / 2,
      width: initialWidth,
      height: initialHeight,
      rotation: 0,
      zIndex: layers.length,
      opacity: 1,
    };
    setLayers([...layers, newLayer].map((layer, index) => ({ ...layer, zIndex: index })));
    setSelectedLayerId(newLayer.id);
    handleShowMessage('Bản vẽ đã được thêm vào canvas!', false);
  }, [layers, editorDimensions, setLayers, handleShowMessage]);


  const handleLoadImageFromHistory = useCallback(async (base64: string, name: string) => {
    if (!currentUser || !currentUser.id) {
        handleShowMessage('Vui lòng đăng nhập để tải ảnh từ lịch sử.', true);
        return;
    }
    const cost = 5; // Example cost for loading from history
    let updatedUserAfterDeduct: User | null = null;
    try {
        updatedUserAfterDeduct = await userService.deductStars(currentUser.id, cost);
    } catch (err: any) {
        if (err.message.includes('Insufficient stars')) {
            handleShowMessage(`Không đủ sao để tải ảnh từ lịch sử. Cần ${cost} sao.`, true);
            return;
        }
        handleShowMessage(`Lỗi khi trừ sao: ${err.message}`, true);
        return;
    }

    if (!updatedUserAfterDeduct) {
        handleShowMessage('Lỗi không xác định khi trừ sao để tải ảnh từ lịch sử.', true);
        return;
    }

    setLoading(true);
    handleShowMessage(`Đang tải ảnh "${name}" từ lịch sử...`, false);
    try {
        const img = new Image();
        img.src = base64;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        const initialWidth = Math.min(img.width, editorDimensions.width * 0.7);
        const initialHeight = (img.height / img.width) * initialWidth;

        const newLayer: ImageLayerData = {
            id: uuidv4(),
            src: base64,
            name: name,
            x: (editorDimensions.width - initialWidth) / 2,
            y: (editorDimensions.height - initialHeight) / 2,
            width: initialWidth,
            height: initialHeight,
            rotation: 0,
            zIndex: layers.length,
            opacity: 1,
        };
        setLayers([...layers, newLayer].map((layer, index) => ({ ...layer, zIndex: index })));
        setSelectedLayerId(newLayer.id);
        handleShowMessage('Ảnh đã được tải lên canvas từ lịch sử!', false);
        setCurrentUser(updatedUserAfterDeduct); // Deduct stars
        saveToLocalStorage('currentUser', updatedUserAfterDeduct); // Persist
        setCurrentScreen('editor'); // Navigate back to editor
    } catch (error: any) {
        console.error('Lỗi khi tải ảnh từ lịch sử:', error);
        handleShowMessage(`Lỗi khi tải ảnh từ lịch sử: ${error.message}.`, true);
    } finally {
        setLoading(false);
    }
  }, [currentUser, editorDimensions, layers.length, handleShowMessage, setLayers]);


  const handleClickOutsideCanvas = useCallback(() => {
    setSelectedLayerId(null);
  }, []);

  // For Compare Slider functionality
  const handleShowCompare = useCallback(async () => {
    if (layers.length === 0 || !canvasEditorRef.current) {
      handleShowMessage('Vui lòng tải ít nhất một lớp để so sánh.', true);
      return;
    }

    setLoading(true);
    handleShowMessage('Đang chuẩn bị ảnh so sánh...', false);
    try {
      // "Before" image: only the first layer if available, or a blank canvas
      const beforeCanvas = await drawLayersOnCanvas(layers.slice(0, 1), exportCanvasRef, editorDimensions.width, editorDimensions.height);
      setBeforeCompareImage(beforeCanvas.toDataURL('image/png'));
      setShowCompareSlider(true);
    } catch (err) {
      console.error('Lỗi khi tạo ảnh so sánh:', err);
      handleShowMessage('Lỗi khi tạo ảnh so sánh.', true);
    } finally {
      setLoading(false);
    }
  }, [layers, editorDimensions, handleShowMessage]);

  const handleCloseCompare = useCallback(() => {
    setShowCompareSlider(false);
    setBeforeCompareImage(null);
  }, []);


  const renderScreen = () => {
    // Ensure currentUser is always passed down as a valid User object or DEFAULT_USER
    const userToPass = currentUser || DEFAULT_USER;

    switch (currentScreen) {
      case 'auth':
        return <AuthScreen onLoginSuccess={handleLoginSuccess} onAdminLogin={handleAdminLogin} onShowForgotPassword={() => setCurrentScreen('forgot-password')} />;
      case 'forgot-password':
        return (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl shadow-2xl max-w-md w-full border-neon-rainbow z-10">
            <h2 className="text-3xl font-bold mb-6 neon-text text-center">Quên mật khẩu?</h2>
            <p className="text-gray-300 text-center mb-4">
              Vui lòng liên hệ Admin qua Zalo để được hỗ trợ. Cung cấp mã bảo mật <span className="text-yellow-400 font-bold">"RESETMKSEA"</span>.
            </p>
            <p className="text-gray-300 text-center mb-6">
              SĐT Admin: <span className="text-blue-400 font-bold">0856848557 - Quang Hổ</span>
            </p>
            <a
              href="https://zalo.me/0856848557"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 rounded-lg font-bold text-lg shadow-lg bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-75 text-center flex items-center justify-center"
              aria-label="Liên hệ Admin qua Zalo"
            >
              <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.87 13.92c-.22.42-.71.55-1.12.33l-2.73-1.4c-.42-.22-.64-.69-.53-1.16l.66-2.52c.11-.47-.14-.97-.61-1.09l-2.87-.73c-.47-.12-.96.16-1.12.63l-.38 1.48c-.16.63-.04 1.25.32 1.76l1.37 1.63c.36.42.3 1.05-.14 1.41l-1.37 1.15c-.44.37-.42.99.04 1.34l2.12 1.68c.46.37 1.11.33 1.54-.1l1.7-1.74c.43-.44.59-1.07.41-1.63l-.71-2.53c-.18-.6.1-1.24.7-1.42l2.67-.84c.6-.18 1.25.1 1.42.7l.4 1.64c.18.6-.07 1.24-.67 1.42z"></path></svg>
              Liên hệ Zalo Admin
            </a>
            <button onClick={() => setCurrentScreen('auth')} className="mt-4 text-blue-400 hover:text-blue-300 transition-colors duration-200 text-sm">
              Quay lại Đăng nhập
            </button>
          </div>
        );
      case 'editor':
        return (
          <div className="flex-grow flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Header */}
            <header className="w-full max-w-4xl text-center mb-6 z-10">
              <h1 className="text-4xl font-extrabold text-white tracking-wide drop-shadow-lg mb-2 neon-text">Separate Clothes</h1>
              <p className="text-lg text-gray-300 drop-shadow-md">Sáng tạo trang phục: Tải lên & sắp xếp các lớp hình ảnh!</p>
            </header>

            {/* Canvas Editor Area */}
            <div
              ref={canvasEditorRef}
              className="relative flex-grow bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden
                         w-full max-w-4xl max-h-[80vh] aspect-video flex items-center justify-center
                         mb-6 transition-all duration-300 ease-in-out"
              onClick={handleClickOutsideCanvas}
              style={{ cursor: selectedLayerId ? 'default' : 'initial' }}
            >
              {layers.length === 0 && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 p-4">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700 transition-colors duration-200 ease-in-out"
                  >
                    <svg
                      className="w-16 h-16 text-gray-400 mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      ></path>
                    </svg>
                    <p className="mb-2 text-lg text-gray-300 font-semibold">Nhấp để tải lên hoặc kéo & thả tệp</p>
                    <p className="text-sm text-gray-400">PNG, JPG (Tối đa 5MB mỗi tệp)</p>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
                  <p className="ml-4 text-white text-lg neon-text">Đang xử lý...</p>
                </div>
              )}

              {error && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-md z-50 animate-bounce">
                  {error}
                </div>
              )}

              {layers.map((layer) => (
                <ImageLayer
                  key={layer.id}
                  layer={layer}
                  onSelect={setSelectedLayerId}
                  onUpdate={handleUpdateLayer}
                  isSelected={selectedLayerId === layer.id}
                  canvasBounds={editorDimensions}
                />
              ))}
              {/* Hidden canvas for export */}
              <canvas ref={exportCanvasRef} className="hidden"></canvas>

              {/* Image Compare Slider */}
              {showCompareSlider && beforeCompareImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-50">
                  <div className="relative">
                    <ImageCompareSlider
                      imageBefore={beforeCompareImage}
                      imageAfter={exportCanvasRef.current?.toDataURL('image/png') || ''} // Current state
                      width={editorDimensions.width * 0.9}
                      height={editorDimensions.height * 0.9}
                    />
                    <button
                      onClick={handleCloseCompare}
                      className="absolute -top-4 -right-4 p-2 bg-red-600 rounded-full text-white hover:bg-red-700 transition-colors shadow-lg"
                      aria-label="Đóng thanh so sánh"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-4xl flex flex-wrap justify-center gap-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 ease-in-out
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75"
                aria-label="Tải thêm ảnh"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Tải thêm ảnh
              </button>
              <button
                onClick={() => dispatch({ type: 'UNDO' })}
                disabled={historyState.past.length === 0 || loading}
                className={`flex items-center px-6 py-3 rounded-lg shadow-md transition-all duration-200 ease-in-out
                           ${historyState.past.length === 0 || loading
                               ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                               : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75'}
                           `}
                aria-label="Hoàn tác"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.975 2.888a1 1 0 00-.363 1.118l1.519 4.674c.3.921-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.975 2.888c-.784.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.975-2.888c-.783-.57-.381-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z"></path></svg>
                Hoàn tác
              </button>
              <button
                onClick={() => dispatch({ type: 'REDO' })}
                disabled={historyState.future.length === 0 || loading}
                className={`flex items-center px-6 py-3 rounded-lg shadow-md transition-all duration-200 ease-in-out
                           ${historyState.future.length === 0 || loading
                               ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                               : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-75'}
                           `}
                aria-label="Làm lại"
              >
                <svg className="w-5 h-5 mr-2 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.975 2.888a1 1 0 00-.363 1.118l1.519 4.674c.3.921-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.975 2.888c-.784.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.975-2.888c-.783-.57-.381-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z"></path></svg>
                Làm lại
              </button>
              <button
                onClick={handleShowCompare}
                disabled={layers.length === 0 || loading}
                className={`flex items-center px-6 py-3 rounded-lg shadow-md transition-all duration-200 ease-in-out
                           ${layers.length === 0 || loading
                               ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                               : 'bg-purple-600 text-white hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75'}
                           `}
                aria-label="So sánh Before/After"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 3-3M6 6h.01M18 6h.01M6 18h.01M18 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                So sánh
              </button>
              <button
                onClick={handleDownload}
                disabled={layers.length === 0 || loading}
                className={`flex items-center px-6 py-3 rounded-lg shadow-md transition-all duration-200 ease-in-out
                           ${layers.length === 0 || loading
                               ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                               : 'bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-75'}
                           `}
                aria-label="Tải ảnh về máy"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l3-3m-3 3l-3-3m-3 8h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                Tải ảnh về máy ({currentUser?.stars})
              </button>
            </div>
          </div>
        );
      case 'profile':
        return currentUser ? <ProfileScreen currentUser={userToPass} onBack={() => setCurrentScreen('editor')} onShowMessage={handleShowMessage} onUpdateCurrentUser={handleUpdateCurrentUser} /> : null;
      case 'shop':
        return currentUser ? <ShopScreen currentUser={userToPass} onBack={() => setCurrentScreen('editor')} onShowMessage={handleShowMessage} onUpdateCurrentUser={handleUpdateCurrentUser} /> : null;
      case 'admin-panel':
        return currentUser ? <AdminPanel currentUser={userToPass} onBack={() => setCurrentScreen('editor')} onUpdateCurrentUser={handleUpdateCurrentUser} /> : null;
      case 'free-draw':
        return currentUser ? <FreeDrawCanvas currentUser={userToPass} onBack={() => setCurrentScreen('editor')} onAddLayer={handleAddLayerFromDrawing} /> : null;
      case 'history':
        return currentUser ? <HistoryScreen currentUser={userToPass} onBack={() => setCurrentScreen('editor')} onLoadImageFromHistory={handleLoadImageFromHistory} /> : null;
      case 'chat':
        return currentUser ? <ChatScreen currentUser={userToPass} onBack={() => setCurrentScreen('editor')} onShowMessage={handleShowMessage} /> : null;
      default:
        return null;
    }
  };


  if (!currentUser && currentScreen !== 'auth' && currentScreen !== 'forgot-password') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900">
        <AuthScreen onLoginSuccess={handleLoginSuccess} onAdminLogin={handleAdminLogin} onShowForgotPassword={() => setCurrentScreen('forgot-password')} />
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen w-full font-sans antialiased text-gray-100 p-0 md:p-4 md:gap-4">
      {/* Hamburger Menu Icon */}
      {currentScreen !== 'auth' && currentScreen !== 'forgot-password' && (
        <button
          onClick={() => setIsMenuOpen(true)}
          className="fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700 transition-colors md:hidden"
          aria-label="Mở menu"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
      )}

      {currentScreen !== 'auth' && currentScreen !== 'forgot-password' && (
        <HamburgerMenu
          isOpen={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          onNavigate={(screen) => { setCurrentScreen(screen); setSelectedLayerId(null); }}
          currentUser={currentUser as User}
          onLogout={handleLogout}
          isAdminMode={isAdminMode}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-grow flex flex-col md:flex-row h-full w-full border-neon-rainbow rounded-xl p-0 md:p-4 relative">
        {renderScreen()}
        {currentScreen === 'editor' && (
          <LayerSidebar
            layers={layers}
            selectedLayerId={selectedLayerId}
            onSelectLayer={setSelectedLayerId}
            onUpdateLayer={handleUpdateLayer}
            onDeleteLayer={handleDeleteLayer}
            onLayerOrderChange={handleLayerOrderChange}
            onClearAllLayers={handleClearAllLayers}
          />
        )}
        {currentScreen === 'editor' && (
          <div className="md:absolute md:bottom-4 md:left-1/2 md:-translate-x-1/2 flex items-center space-x-4 p-4 md:p-0 bg-gray-900 md:bg-transparent rounded-t-xl md:rounded-none z-20 w-full md:w-auto justify-center">
            <ResolutionSelector
              selectedResolution={selectedResolution}
              onSelectResolution={(res) => { setSelectedResolution(res); saveToLocalStorage('lastResolution', res); }}
              disabled={loading}
            />
             <span className="text-sm text-gray-400">Giá: {getCostForResolution(selectedResolution)} Sao</span>
          </div>
        )}
      </div>


      {toastMessage && (
        <div
          className={`fixed bottom-4 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg z-50 animate-fade-in-down transition-colors duration-200
            ${toastMessage.isError ? 'bg-red-600' : 'bg-green-600'}`}
          role="alert"
          aria-live="assertive"
        >
          <p className="font-semibold">{toastMessage.message}</p>
        </div>
      )}
    </div>
  );
};

export default App;