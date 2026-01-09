import React, { useState, useEffect, useRef } from 'react';
import { User, VIP_TIERS, updateCurrentUserClientSide } from '../utils/appUtils';
import * as chatService from '../services/chat';
import { ChatMessage } from '../db/schema'; // Import ChatMessage schema

interface ChatScreenProps {
  currentUser: User;
  onBack: () => void;
  onShowMessage: (message: string, isError: boolean) => void;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ currentUser, onBack, onShowMessage }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isFetchingMessages, setIsFetchingMessages] = useState(false);

  const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;

  // Fetch initial messages
  useEffect(() => {
    const loadMessages = async () => {
      setIsFetchingMessages(true);
      try {
        const fetchedMessages = await chatService.fetchMessages();
        setMessages(fetchedMessages);
      } catch (err) {
        console.error('Error fetching messages:', err);
        onShowMessage('Lỗi khi tải tin nhắn.', true);
      } finally {
        setIsFetchingMessages(false);
      }
    };
    loadMessages();

    // In a real app, this would be a WebSocket listener
    // For this simulation, we'll just periodically refetch or rely on sendMessage updating state
    const interval = setInterval(loadMessages, 5000); // Poll every 5 seconds for new messages
    return () => clearInterval(interval);
  }, [onShowMessage]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMessageLimit = () => {
    const benefitMatch = userRoleData.benefits.find(b => b.includes('tin nhắn chat/ngày'));
    if (benefitMatch) {
      const match = benefitMatch.match(/(\d+|\Vô hạn) tin nhắn chat\/ngày/);
      if (match && match[1] === 'Vô hạn') return Infinity;
      if (match) return parseInt(match[1], 10);
    }
    return 0; // Default for GUEST if not specified
  };

  const getCooldownTime = () => {
    const benefitMatch = userRoleData.benefits.find(b => b.includes('Cooldown'));
    if (benefitMatch) {
      const match = benefitMatch.match(/Cooldown (\d+)s/);
      if (match) return parseInt(match[1], 10);
    }
    return 30; // Default for GUEST
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage || cooldown > 0) return;

    const messageLimit = getMessageLimit();
    // Use message.timestamp (number) directly for comparison
    const messagesToday = messages.filter(
      m => m.senderId === currentUser.id && m.timestamp > (Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    if (messagesToday >= messageLimit && messageLimit !== Infinity) {
      onShowMessage('Bạn đã đạt giới hạn tin nhắn hôm nay.', true);
      setNewMessage('');
      return;
    }
    if (userRoleData.level < VIP_TIERS.GUEST.level) {
      onShowMessage('Bạn cần có cấp độ để gửi tin nhắn.', true);
      setNewMessage('');
      return;
    }

    try {
      const sentMessage = await chatService.sendMessage(
        currentUser.id,
        currentUser.username,
        currentUser.role,
        trimmedMessage
      );
      if (sentMessage) {
        // In a real app with WebSockets, this update would come from the server broadcast.
        // For simulation, we update locally.
        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        setCooldown(getCooldownTime());
        // Update client-side user state (like stars if any chat cost)
        updateCurrentUserClientSide({
          updatedAt: Date.now() // Use number directly
        });
      } else {
        onShowMessage('Lỗi khi gửi tin nhắn.', true);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      onShowMessage('Lỗi khi gửi tin nhắn. Vui lòng thử lại.', true);
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);


  const getRoleColor = (role: User['role']) => {
    const roleLevel = VIP_TIERS[role.toUpperCase()]?.level || 0;
    if (roleLevel >= VIP_TIERS.ADMIN.level) return 'text-red-500';
    if (roleLevel >= VIP_TIERS.MODERATOR.level) return 'text-purple-400';
    if (roleLevel >= VIP_TIERS.LIFETIME.level) return 'text-pink-400';
    if (roleLevel >= VIP_TIERS.ULTRA_INFINITY.level) return 'text-yellow-400';
    if (roleLevel >= VIP_TIERS.SSVIP.level) return 'text-emerald-400';
    if (roleLevel >= VIP_TIERS.VIP.level) return 'text-blue-400';
    return 'text-gray-400';
  };

  const canChat = userRoleData.level >= VIP_TIERS.GUEST.level;
  const inputDisabled = cooldown > 0 || !canChat || isFetchingMessages;

  return (
    <div className="flex flex-col p-6 bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl h-full border-neon-rainbow overflow-hidden">
      <h2 className="text-3xl font-bold mb-4 neon-text text-center">Chat Cộng Đồng</h2>
      <p className="text-center text-gray-400 text-sm mb-4">
        Bạn đang là cấp <span className="neon-text font-semibold">{userRoleData.name}</span>. Giới hạn tin nhắn: {getMessageLimit() === Infinity ? 'Vô hạn' : `${getMessageLimit()} tin/ngày`} (Cooldown: {getCooldownTime()}s).
        {currentUser.role.toUpperCase() === 'ULTRA_INFINITY' && (
          <span className="block text-blue-300 mt-1">Bạn có quyền truy cập chat Admin.</span>
        )}
      </p>

      <div className="flex-grow overflow-y-auto no-scrollbar p-2 mb-4 bg-gray-800 rounded-lg">
        {isFetchingMessages && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
            Đang tải tin nhắn...
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`mb-3 ${msg.senderId === currentUser.id ? 'text-right' : 'text-left'}`}>
              <span className={`text-xs ${getRoleColor(msg.senderRole)} font-semibold`}>
                {msg.senderId === currentUser.id ? 'Bạn' : msg.senderUsername} <span className="text-gray-500 text-xs">({VIP_TIERS[msg.senderRole]?.name || msg.senderRole})</span>
              </span>
              <div className={`p-2 rounded-lg inline-block ${msg.senderId === currentUser.id ? 'bg-blue-600 ml-auto' : 'bg-gray-700 mr-auto'} max-w-[70%]`}>
                <p className="text-white text-sm break-words">{msg.content}</p>
              </div>
              <span className="block text-xs text-gray-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="flex mt-auto space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={inputDisabled ? `Chờ ${cooldown}s...` : 'Nhập tin nhắn...'}
          className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          disabled={inputDisabled}
          aria-label="Nhập tin nhắn"
        />
        <button
          type="submit"
          className={`py-3 px-6 rounded-lg font-bold transition-all duration-200 ease-in-out
            ${inputDisabled
              ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75'}
          `}
          disabled={inputDisabled}
          aria-label="Gửi tin nhắn"
        >
          Gửi
        </button>
      </form>

      <button onClick={onBack} className="mt-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">
        Quay lại
      </button>
    </div>
  );
};

export default ChatScreen;