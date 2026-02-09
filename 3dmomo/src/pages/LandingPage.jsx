import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { Box, Settings, Cpu, Beaker, ArrowRight, Play, Eye, MessageSquare, BookOpen, LogOut, User } from 'lucide-react'; // 아이콘 추가

export default function LandingPage() {
    const navigate = useNavigate();
    const [isVisible, setIsVisible] = useState(false);
    const [user, setUser] = useState(null); // 유저 상태 추가

    useEffect(() => {
        // 1. 애니메이션 트리거
        setTimeout(() => setIsVisible(true), 100);

        // 2. 로그인 상태 확인 (localStorage)
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    // 로그아웃 처리 함수
    const handleLogout = () => {
        localStorage.removeItem('user'); // 저장된 정보 삭제
        setUser(null); // 상태 초기화
        alert('로그아웃 되었습니다.');
        navigate('/'); // 메인으로 리다이렉트
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_rgba(0,40,20,0.4)_0%,_rgba(0,0,0,1)_50%,_rgba(0,0,0,1)_100%)] text-white font-sans">
            {/* ... 배경 효과 코드는 그대로 유지 ... */}
            <div className="absolute -left-40 top-1/4 w-[600px] h-[600px] bg-[rgb(0,255,133)] opacity-15 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute -right-40 top-2/3 w-[500px] h-[500px] bg-[rgb(0,255,133)] opacity-12 blur-[140px] rounded-full pointer-events-none" />

            {/* ... 중간 장식 요소들 그대로 유지 ... */}

            {/* 2. 네비게이션 (수정된 부분) */}
            <nav
                className={`relative z-10 flex items-center justify-between px-8 py-6 transition-all duration-700 ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'
                }`}
            >
                <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                    <div className="w-10 h-10 rounded-lg bg-[rgb(0,255,133)] flex items-center justify-center transition-transform group-hover:scale-105">
                        <Box className="w-6 h-6 text-black" />
                    </div>
                    <span className="text-2xl font-bold tracking-tight">
                        <span className="text-[rgb(0,255,133)]">SIMVEX</span>
                    </span>
                </div>

                <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-8 text-sm hidden md:flex">
                    <button onClick={() => navigate('/')} className="text-white hover:text-[rgb(0,255,133)] transition-colors font-medium text-lg">
                        HOME
                    </button>
                    <button onClick={() => navigate('/browse')} className="text-[rgba(255,255,255,0.7)] hover:text-[rgb(0,255,133)] transition-colors font-medium text-lg">
                        3D MODELS
                    </button>
                </div>

                {/* 여기가 핵심: 로그인 상태에 따라 다른 버튼 표시 */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <>
                            <div className="flex items-center gap-2 mr-2">
                                <div className="w-8 h-8 rounded-full bg-[rgba(0,255,133,0.2)] flex items-center justify-center text-[rgb(0,255,133)]">
                                    <User className="w-5 h-5" />
                                </div>
                                <span className="text-white font-medium">
                                    <span className="text-[rgb(0,255,133)]">{user.username}</span>님
                                </span>
                            </div>
                            <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2 px-4">
                                <LogOut className="w-4 h-4" /> 로그아웃
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => navigate('/login')}>로그인</Button>
                            <Button variant="primary" onClick={() => navigate('/signup')}>시작하기</Button>
                        </>
                    )}
                </div>
            </nav>

            {/* ... 나머지 섹션들(히어로, 워크플로우 등)은 기존 코드 그대로 유지 ... */}
            {/* (길어서 생략했지만 기존 코드 그대로 두시면 됩니다) */}
            <section className="relative z-10 min-h-[calc(100vh-88px)] flex items-center justify-center px-8 -mt-12">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                        {/* ... 기존 내용 ... */}
                        <div className={`transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10'}`}>
                            <h1 className="text-7xl font-bold leading-[1.1] mb-8">
                                COMPLEX<br />
                                <span className="text-[rgb(0,255,133)]">TO SIMPLE</span><br />
                                FAST.
                            </h1>
                            <p className="text-xl text-[rgba(255,255,255,0.7)] mb-10 leading-relaxed">
                                복잡한 공학 구조를 3D로 보고, AI에게 묻고,<br/> 노트로 정리하세요.
                            </p>
                            <div className="flex items-center gap-5">
                                {/* 시작 버튼도 로그인 상태에 따라 다르게 동작하게 할 수 있음 */}
                                <Button variant="primary" size="md" onClick={() => navigate('/browse')} icon={<Play className="w-5 h-5" />} className="text-lg px-8 py-6">
                                    Start Learning
                                </Button>
                                <Button variant="outline" size="md" onClick={() => navigate('/browse')} className="text-lg px-8 py-6">
                                    Explore Models
                                </Button>
                            </div>
                        </div>
                        {/* Right: 3D Preview Card */}
                        <div className={`relative transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-10'}`}>
                            <div className="absolute inset-0 bg-[rgb(0,255,133)] opacity-20 blur-[120px] rounded-full" />
                            <GlassCard className="relative overflow-hidden" glow>
                                <div className="aspect-[4/3] bg-[rgb(10,15,13)] rounded-lg flex items-center justify-center border border-[rgba(0,255,133,0.3)]">
                                    <div className="text-center">
                                        <Box className="w-24 h-24 mx-auto mb-4 text-[rgb(0,255,133)] animate-spin" style={{ animationDuration: '8s' }} />
                                        <p className="text-[rgba(255,255,255,0.5)] text-lg">3D Viewer Preview</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    </div>
                </div>
            </section>
            {/* ... 나머지 하단 섹션들 생략 (기존 코드 유지) ... */}
            <section className="relative z-10 max-w-6xl mx-auto px-8 py-20">
                {/* ... 내용 유지 ... */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* ... 3 Cards 유지 ... */}
                    <div className={`transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="bg-[rgba(15,15,15,0.8)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 hover:border-[rgba(0,255,133,0.3)] transition-all duration-300 h-full group">
                            <div className="w-14 h-14 rounded-xl bg-[rgba(0,255,133,0.15)] border border-[rgba(0,255,133,0.3)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <Eye className="w-7 h-7 text-[rgb(0,255,133)]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">3D</h3>
                            <p className="text-[rgba(255,255,255,0.6)] text-base leading-relaxed">
                                회전, 줌, 분해 기능으로 부품과 조립품 구조를 직관적으로 탐색하고 이해합니다.
                            </p>
                        </div>
                    </div>
                    {/* ... 나머지 카드들 ... */}
                    <div className={`transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="bg-[rgba(15,15,15,0.8)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 hover:border-[rgba(0,255,133,0.3)] transition-all duration-300 h-full group">
                            <div className="w-14 h-14 rounded-xl bg-[rgba(0,255,133,0.15)] border border-[rgba(0,255,133,0.3)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <MessageSquare className="w-7 h-7 text-[rgb(0,255,133)]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">AI</h3>
                            <p className="text-[rgba(255,255,255,0.6)] text-base leading-relaxed">
                                궁금한 구조에 대해 즉시 질문하고 맞춤형 설명을 받습니다.
                            </p>
                        </div>
                    </div>
                    <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <div className="bg-[rgba(15,15,15,0.8)] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 hover:border-[rgba(0,255,133,0.3)] transition-all duration-300 h-full group">
                            <div className="w-14 h-14 rounded-xl bg-[rgba(0,255,133,0.15)] border border-[rgba(0,255,133,0.3)] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                                <BookOpen className="w-7 h-7 text-[rgb(0,255,133)]" />
                            </div>
                            <h3 className="text-2xl font-bold mb-3">Notes</h3>
                            <p className="text-[rgba(255,255,255,0.6)] text-base leading-relaxed">
                                학습 중 떠오른 아이디어와 핵심 내용을 바로 기록하고 저장합니다.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            {/* ... How It Works, Category, CTA, Footer 모두 유지 ... */}
        </div>
    );
}