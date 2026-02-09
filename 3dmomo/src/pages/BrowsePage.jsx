import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Box, Search, ChevronDown, User, LogOut } from 'lucide-react'; 
import { useState, useEffect } from 'react';

// 실제 GitHub 로봇 암 부품 데이터
const sampleModels = [
    {
        id: '1',
        name: '드론',
        fileName: 'BaseGear.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 64400,
        category: '로봇 공학',
        thumbnail: '/models/Drone/1.png'
    },
    {
        id: '2',
        name: '판 스프링',
        fileName: 'BaseMountingbracket.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 23200,
        category: '로봇 공학',
        thumbnail: '/models/LeafSpring/2.png'
    },
    {
        id: '3',
        name: '공작 기계 바이스',
        fileName: 'BasePlate.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 89600,
        category: '로봇 공학',
        thumbnail: '/models/MachineVice/3.jpg'
    },
    {
        id: '4',
        name: '로봇 팔',
        fileName: 'Gearlink1.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 278300,
        category: '로봇 공학',
        thumbnail: '/models/RobotArm/4.png'
    },
    {
        id: '5',
        name: '로봇 집게',
        fileName: 'Gearlink2.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 155400,
        category: '로봇 공학',
        thumbnail: '/models/RobotGripper/5.png'
    },
    {
        id: '6',
        name: '서스펜션',
        fileName: 'Gripper.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 173400,
        category: '로봇 공학',
        thumbnail: '/models/Suspension/6.png'
    },
    {
        id: '7',
        name: 'V4 실린더',
        fileName: 'Link.glb',
        fileType: 'glb',
        downloadUrl: '',
        size: 166200,
        category: '로봇 공학',
        thumbnail: '/models/V4_Engine/7.png'
    }
];

export default function BrowsePage() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredModels, setFilteredModels] = useState(sampleModels);
    const [selectedCategory, setSelectedCategory] = useState('All Categories');
    const [user, setUser] = useState(null);

    // 초기값을 localStorage에서 가져오기
    const [favoritedModels, setFavoritedModels] = useState(() => {
        const saved = localStorage.getItem('favoritedModels');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        setTimeout(() => setIsVisible(true), 100);
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('user');
        setUser(null);
        alert('로그아웃 되었습니다.');
        navigate('/');
    };

    const handleSearch = (e) => {
        const term = e.target.value;
        setSearchTerm(term);

        if (term) {
            const filtered = sampleModels.filter(model =>
                model.name.toLowerCase().includes(term.toLowerCase()) ||
                model.category.toLowerCase().includes(term.toLowerCase())
            );
            setFilteredModels(filtered);
        } else {
            setFilteredModels(sampleModels);
        }
    };

    const toggleFavorite = (modelId) => {
        setFavoritedModels(prev => {
            let newFavorites;
            if (prev.includes(modelId)) {
                newFavorites = prev.filter(id => id !== modelId);
            } else {
                newFavorites = [...prev, modelId];
            }
            localStorage.setItem('favoritedModels', JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    // ✅ [수정] sortedModels 변수 제거함
    // 즐겨찾기 여부에 따라 정렬하면 클릭 시 위치가 바뀌므로, 
    // 렌더링 시에는 검색 결과(filteredModels)를 그대로 사용하여 순서를 고정합니다.

    return (
        <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(0,40,20,0.4)_0%,_rgba(0,0,0,1)_50%,_rgba(0,0,0,1)_100%)]">
            {/* 배경 효과 */}
            <div className="absolute -left-40 top-1/4 w-[600px] h-[600px] bg-[#00FF85] opacity-15 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute -right-40 top-2/3 w-[500px] h-[500px] bg-[#00FF85] opacity-12 blur-[140px] rounded-full pointer-events-none" />
            <div className="absolute w-96 h-96 top-20 -right-48 opacity-30 rounded-full border border-[rgba(255,255,255,0.1)] pointer-events-none" />
            <div className="absolute w-64 h-64 bottom-40 -left-32 opacity-20 rounded-full border border-[rgba(255,255,255,0.1)] pointer-events-none" />

            {/* Navigation */}
            <nav
                className="relative z-10 flex items-center justify-between px-8 py-6 transition-all duration-700"
                style={{
                    opacity: isVisible ? 1 : 0,
                    transform: isVisible ? 'translateY(0)' : 'translateY(-20px)'
                }}
            >
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-lg bg-[#00FF85] flex items-center justify-center">
                        <Box className="w-6 h-6 text-black" />
                    </div>
                    <span className="text-2xl font-bold text-white">
                        <span className="text-[#00FF85]">SIMVEX</span>
                    </span>
                </div>
                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-8 text-sm">
                    <button
                        onClick={() => navigate('/')}
                        className="text-[rgba(255,255,255,0.7)] hover:text-[#00FF85] transition-colors font-medium text-lg"
                    >
                        HOME
                    </button>
                    <button
                        onClick={() => navigate('/browse')}
                        className="text-white hover:text-[#00FF85] transition-colors font-medium text-lg"
                    >
                        3D MODELS
                    </button>
                </div>

                {/* 로그인 상태 표시 영역 */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-[rgba(0,255,133,0.2)] flex items-center justify-center text-[rgb(0,255,133)]">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className="text-white font-medium">
                                    <span className="text-[rgb(0,255,133)]">{user.username}</span>님
                                </span>
                            </div>
                            <Button variant="outline" onClick={handleLogout} className="text-xs px-3 py-1.5 h-8">
                                로그아웃
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => navigate('/login')}>
                            로그인
                        </Button>
                    )}
                </div>
            </nav>

            {/* Main Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-8 py-12">
                <div
                    className="mb-12 transition-all duration-1000 delay-200"
                    style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(30px)'
                    }}
                >
                    <h1 className="mb-4 text-4xl font-bold text-white">
                        학습할 <span className="text-[#00FF85]">모델</span>을 선택하세요
                    </h1>
                    <p className="text-[rgba(255,255,255,0.7)] text-lg">
                        다양한 공학 모델을 3D로 탐험하고 깊이 있게 학습하세요
                    </p>
                </div>

                {/* Search and Filter */}
                <div
                    className="flex gap-4 mb-8 transition-all duration-1000 delay-300"
                    style={{
                        opacity: isVisible ? 1 : 0,
                        transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(20px)'
                    }}
                >
                    <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[rgba(255,255,255,0.45)]" />
                        <input
                            type="text"
                            placeholder="Search models..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-12 pr-4 py-3 bg-[rgba(15,15,15,0.8)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm placeholder:text-[rgba(255,255,255,0.45)] focus:outline-none focus:border-[rgb(0,255,133)] transition-colors"
                        />
                    </div>

                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-3 bg-[rgba(15,15,15,0.8)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm focus:outline-none focus:border-[rgb(0,255,133)] transition-colors cursor-pointer min-w-[180px]"
                        >
                            <option>All Categories</option>
                            <option>로봇 공학</option>
                            <option>기계 공학</option>
                            <option>전기 공학</option>
                        </select>
                    </div>
                </div>

                {/* Models Grid */}
                <div
                    className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-5 transition-all duration-1000 delay-400"
                    style={{ /* ... */ }}
                >
                    {/* ✅ [수정] sortedModels 대신 filteredModels를 사용하여 순서를 고정함 */}
                    {filteredModels.map((model) => {
                        const isFavorited = favoritedModels.includes(model.id);
                        return (
                            <div
                                key={model.id}
                                className="relative bg-[rgba(15,15,15,0.8)] border border-[rgba(255,255,255,0.08)] rounded-xl overflow-hidden hover:border-[rgba(0,255,133,0.4)] transition-all duration-300 group"
                            >
                                {/* Thumbnail 영역 */}
                                <div className="aspect-[4/3] bg-[#1a1a1a] flex items-center justify-center border-b border-[rgba(255,255,255,0.08)] group-hover:border-[rgba(0,255,133,0.2)] transition-colors overflow-hidden">
                                    <div className="w-full h-full flex items-center justify-center bg-[#1a1a1a] select-none overflow-hidden">
                                        {model.thumbnail.startsWith('/') ? (
                                            <img
                                                src={model.thumbnail}
                                                alt={model.name}
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                onError={(e) => {
                                                    e.target.style.display = 'none';
                                                    e.target.parentElement.innerHTML = '<span class="text-4xl">📦</span>';
                                                }}
                                            />
                                        ) : (
                                            <span className="text-4xl group-hover:scale-110 transition-transform duration-300">
                                                {model.thumbnail}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <h3 className="text-base font-semibold mb-1 text-[#00FF85] transition-colors min-h-[48px] line-clamp-2">
                                                {model.name}
                                            </h3>
                                            <p className="text-xs text-[rgba(255,255,255,0.5)]">
                                                {model.category}
                                            </p>
                                        </div>
                                        <button
                                            className="flex-shrink-0 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(model.id);
                                            }}
                                        >
                                            {isFavorited ? (
                                                <svg className="w-5 h-5 text-[rgb(255,20,100)]" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                                </svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-[rgba(255,255,255,0.4)] hover:text-[rgb(255,20,100)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="w-full px-4 py-2.5 bg-[rgba(0,255,133,0.1)] border border-[rgba(0,255,133,0.3)] text-[rgb(0,255,133)] rounded-lg hover:bg-[rgba(0,255,133,0.15)] transition-colors text-sm font-semibold"
                                            onClick={() => navigate(`/study/${model.id}`)}
                                        >
                                            Open
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}