import React, { useState, useEffect } from 'react';
import { User, VIP_TIERS } from '../utils/appUtils';
import * as shopService from '../services/shop';
// Fix: Ensure userService is correctly imported and aliased for consistent usage.
// The original import syntax was correct, but renaming the alias might resolve obscure tooling issues
// reported on line 4, while definitively addressing its usage on lines 31 and 35.
import * as UserService from '../services/user';
import { Frame, StarPack, VipTier } from '../db/schema'; // Import schemas

interface ShopScreenProps {
  currentUser: User;
  onBack: () => void;
  onShowMessage: (message: string, isError: boolean) => void;
  onUpdateCurrentUser: (user: User) => void; // Callback to update currentUser in App.tsx
}

const ShopScreen: React.FC<ShopScreenProps> = ({ currentUser, onBack, onShowMessage, onUpdateCurrentUser }) => {
  const [activeTab, setActiveTab] = useState<'stars' | 'vip' | 'frames'>('stars');
  const [starPacks, setStarPacks] = useState<StarPack[]>([]);
  const [vipTiers, setVipTiers] = useState<VipTier[]>([]);
  const [framePacks, setFramePacks] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);

  const userRoleData = VIP_TIERS[currentUser.role.toUpperCase()] || VIP_TIERS.GUEST;

  // Fetch shop data on mount
  useEffect(() => {
    const loadShopData = async () => {
      setLoading(true);
      try {
        const fetchedStarPacks = await shopService.fetchStarPacks();
        setStarPacks(fetchedStarPacks);

        // Fix: Use the correctly aliased `UserService` here.
        const fetchedVipTiers = await UserService.fetchVipTiers();
        // Filter out GUEST and sort
        setVipTiers(fetchedVipTiers.filter(tier => tier.name.toUpperCase() !== 'GUEST').sort((a,b) => a.level - b.level));

        // Fix: Use the correctly aliased `UserService` here.
        const fetchedFrames = await UserService.fetchFrames();
        setFramePacks(fetchedFrames.filter(f => f.priceStars > 0 || f.isExclusive)); // Only show purchasable frames
      } catch (err) {
        console.error('Error loading shop data:', err);
        onShowMessage('Lỗi khi tải dữ liệu cửa hàng.', true);
      } finally {
        setLoading(false);
      }
    };
    loadShopData();
  }, [onShowMessage]);


  const handleBuyStars = async (packId: string, amount: number, priceDisplay: string) => {
    if (!currentUser.id) {
      onShowMessage('Bạn cần đăng nhập để mua sao.', true);
      return;
    }
    onShowMessage(`Đang xử lý mua ${amount} sao...`, false);
    try {
      const updatedUser = await shopService.buyStars(currentUser.id, packId);
      if (updatedUser) {
        onUpdateCurrentUser(updatedUser); // Update parent state
        onShowMessage(`Bạn đã nhận ${amount} sao! Vui lòng chuyển khoản ${priceDisplay} để xác nhận.`, false);
      } else {
        onShowMessage('Lỗi khi mua sao. Vui lòng thử lại.', true);
      }
    } catch (err) {
      console.error('Error buying stars:', err);
      onShowMessage('Lỗi khi mua sao. Vui lòng thử lại.', true);
    }
  };

  const handleBuyVip = async (vipTierId: string, roleName: string, priceDisplay: string) => {
    if (!currentUser.id) {
      onShowMessage('Bạn cần đăng nhập để nâng cấp VIP.', true);
      return;
    }
    onShowMessage(`Đang xử lý nâng cấp lên gói ${roleName}...`, false);
    try {
      const updatedUser = await shopService.upgradeVip(currentUser.id, vipTierId);
      if (updatedUser) {
        onUpdateCurrentUser(updatedUser); // Update parent state
        onShowMessage(`Bạn đã nâng cấp lên gói ${roleName}! Vui lòng chuyển khoản ${priceDisplay} để xác nhận.`, false);
      } else {
        onShowMessage('Lỗi khi nâng cấp VIP. Vui lòng thử lại.', true);
      }
    } catch (err) {
      console.error('Error upgrading VIP:', err);
      onShowMessage('Lỗi khi nâng cấp VIP. Vui lòng thử lại.', true);
    }
  };

  const handleBuyFrame = async (frameId: string, frameName: string, costStars: number) => {
    if (!currentUser.id) {
      onShowMessage('Bạn cần đăng nhập để mua khung.', true);
      return;
    }

    onShowMessage(`Đang xử lý mua khung ${frameName} (mất ${costStars} sao)...`, false);
    try {
      const updatedUser = await shopService.buyFrame(currentUser.id, frameId);
      if (updatedUser) {
        onUpdateCurrentUser(updatedUser); // Update parent state
        onShowMessage(`Bạn đã mua khung ${frameName} thành công!`, false);
      } else {
        onShowMessage('Bạn không đủ sao để mua khung này hoặc khung không hợp lệ.', true);
      }
    } catch (err) {
      console.error('Error buying frame:', err);
      onShowMessage('Lỗi khi mua khung. Vui lòng thử lại.', true);
    }
  };

  const paymentInfo = {
    bank: "MB Bank",
    accountName: "SAM BA VUONG",
    accountNumber: "86869999269999",
    note: "Đây là tài khoản ngân hàng của nhân viên đổi tiền NDT của tôi,không phải của tôi vì tôi không chi tiền VNĐ, lưu chuyển khoản đúng,sợ tiền tôi chịu trách nhiệm!",
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl h-full border-neon-rainbow overflow-hidden">
        <h2 className="text-3xl font-bold mb-6 neon-text text-center">Cửa hàng</h2>
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mr-3"></div>
          Đang tải cửa hàng...
        </div>
        <button onClick={onBack} className="mt-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors">
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 bg-gray-900 rounded-xl shadow-2xl w-full max-w-4xl h-full border-neon-rainbow overflow-hidden">
      <h2 className="text-3xl font-bold mb-4 neon-text text-center">Cửa hàng</h2>
      <p className="text-center text-gray-400 text-sm mb-4">
        Số sao hiện tại của bạn: <span className="text-yellow-400 font-bold">{currentUser.stars}</span>
      </p>

      {/* Tabs */}
      <div className="flex justify-center mb-6">
        <button
          onClick={() => setActiveTab('stars')}
          className={`px-4 py-2 rounded-l-lg font-semibold transition-colors ${activeTab === 'stars' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Mua Sao
        </button>
        <button
          onClick={() => setActiveTab('vip')}
          className={`px-4 py-2 font-semibold transition-colors ${activeTab === 'vip' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Nâng cấp VIP
        </button>
        <button
          onClick={() => setActiveTab('frames')}
          className={`px-4 py-2 rounded-r-lg font-semibold transition-colors ${activeTab === 'frames' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
        >
          Khung Avatar
        </button>
      </div>

      <div className="flex-grow overflow-y-auto no-scrollbar p-2">
        {/* Buy Stars Tab */}
        {activeTab === 'stars' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {starPacks.map((pack) => (
              <div key={pack.id} className="bg-gray-800 p-5 rounded-lg shadow-md flex flex-col items-center text-center">
                <p className="text-3xl font-bold text-yellow-400 mb-2 flex items-center">
                  {pack.amount}
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.975 2.888a1 1 0 00-.363 1.118l1.519 4.674c.3.921-.755 1.688-1.539 1.118l-3.975-2.888a1 1 0 00-1.176 0l-3.975 2.888c-.784.57-1.838-.197-1.539-1.118l1.519-4.674a1 1 0 00-.363-1.118l-3.975-2.888c-.783-.57-.381-1.81.588-1.81h4.915a1 1 0 00.95-.69l1.519-4.674z"></path></svg>
                </p>
                <p className="text-xl text-gray-200 mb-4">{pack.priceVND.toLocaleString('vi-VN')} VNĐ / {pack.priceUSD.toFixed(2)} USD</p>
                <button
                  onClick={() => handleBuyStars(pack.id, pack.amount, `${pack.priceVND.toLocaleString('vi-VN')} VNĐ / ${pack.priceUSD.toFixed(2)} USD`)}
                  className="w-full py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors"
                >
                  Mua ngay
                </button>
              </div>
            ))}
          </div>
        )}

        {/* VIP Upgrade Tab */}
        {activeTab === 'vip' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {vipTiers.map((pack) => {
              const currentVipLevel = userRoleData.level;
              const packVipLevel = pack.level;
              const isCurrent = currentUser.role.toUpperCase() === pack.name.toUpperCase().replace(/[^A-Z_]/g, '');
              const isDisabled = currentVipLevel >= packVipLevel && !isCurrent;

              let displayedPrice = pack.priceVND ? `${pack.priceVND.toLocaleString('vi-VN')} VNĐ / ${pack.priceUSD?.toFixed(2) || ''} USD` : 'Miễn phí';
              let discountText = '';

              if (pack.name.includes('Người kiểm duyệt')) { // Check for Moderator tier
                let discount = 0;
                if (currentVipLevel >= VIP_TIERS.LIFETIME.level) { discount = 25; }
                else if (currentVipLevel >= VIP_TIERS.ULTRA_INFINITY.level) { discount = 15; }
                else if (currentVipLevel >= VIP_TIERS.SSVIP.level) { discount = 5; }

                if (discount > 0) {
                  discountText = ` (giảm ${discount}%)`;
                  // Actual price calculation would happen here in a real app
                }
                displayedPrice = `${displayedPrice}${discountText}`;
              }

              return (
                <div key={pack.id} className={`bg-gray-800 p-5 rounded-lg shadow-md flex flex-col ${isCurrent ? 'border-2 border-blue-500' : ''}`}>
                  <h3 className="text-2xl font-bold neon-text mb-2">{pack.name} {isCurrent && '(Hiện tại)'}</h3>
                  <p className="text-xl text-gray-200 mb-3">{displayedPrice}</p>
                  <ul className="text-gray-300 text-sm mb-4 flex-grow space-y-1">
                    {pack.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-center">
                        <svg className="w-4 h-4 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleBuyVip(pack.id, pack.name, displayedPrice)}
                    className={`w-full py-2 rounded-lg font-bold transition-colors
                      ${isDisabled
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : isCurrent
                          ? 'bg-blue-700 text-white cursor-default'
                          : 'bg-green-600 hover:bg-green-700 text-white'}
                    `}
                    disabled={isDisabled || isCurrent}
                  >
                    {isCurrent ? 'Đã có gói này' : 'Nâng cấp ngay'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Frames Tab */}
        {activeTab === 'frames' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {framePacks.map((pack) => {
              const isDisabled = userRoleData.level < pack.minLevel;
              const isOwned = currentUser.frameId === pack.id;

              return (
                <div key={pack.id} className={`bg-gray-800 p-5 rounded-lg shadow-md flex flex-col items-center text-center ${isOwned ? 'border-2 border-blue-500' : ''}`}>
                  <img src={pack.imageUrl} alt={pack.name} className="w-24 h-24 object-cover rounded-full mb-3 border-2 border-gray-600" />
                  <h3 className="text-lg font-bold text-white mb-2">{pack.name}</h3>
                  <p className="text-yellow-400 text-lg font-bold mb-4">
                    {pack.priceStars > 0 ? `${pack.priceStars} Sao` : 'Miễn phí'}
                  </p>
                  <button
                    onClick={() => handleBuyFrame(pack.id, pack.name, pack.priceStars)}
                    className={`w-full py-2 rounded-lg font-bold transition-colors
                      ${isDisabled || isOwned
                        ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'}
                    `}
                    disabled={isDisabled || isOwned}
                  >
                    {isOwned ? 'Đã sở hữu' : (isDisabled ? `Cần VIP ${VIP_TIERS[Object.keys(VIP_TIERS).find(key => VIP_TIERS[key].level === pack.minLevel)?.toUpperCase() || 'GUEST']?.name || pack.minLevel}` : 'Mua khung')}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment Info */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-inner mt-6">
        <h3 className="text-xl font-bold text-white mb-3">Thông tin thanh toán</h3>
        <p className="text-gray-300 text-sm">
          Vui lòng chuyển khoản tới thông tin dưới đây để mua Sao hoặc nâng cấp gói VIP.
        </p>
        <ul className="mt-3 space-y-1 text-gray-200 text-md">
          <li><strong>Ngân hàng:</strong> {paymentInfo.bank}</li>
          <li><strong>Tên Chủ TK:</strong> {paymentInfo.accountName}</li>
          <li><strong>Số TK:</strong> <span className="text-blue-400 font-semibold">{paymentInfo.accountNumber}</span></li>
        </ul>
        <p className="mt-3 text-red-400 text-sm font-semibold">
          LƯU Ý QUAN TRỌNG: {paymentInfo.note}
        </p>
      </div>

      <button onClick={onBack} className="mt-4 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors shadow-md">
        Quay lại
      </button>
    </div>
  );
};

export default ShopScreen;