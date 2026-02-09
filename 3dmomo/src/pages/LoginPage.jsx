import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/Input';
import { Box } from 'lucide-react';

export default function LoginPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => { // async 추가
        e.preventDefault();

        try {
            // 1. 백엔드로 로그인 요청
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // 2. 로그인 성공 시 정보 저장 (나중에 사용자 이름 표시용)
                localStorage.setItem('user', JSON.stringify(data));
                //alert(data.message); // 필요 시 주석 해제
                navigate('/browse'); // 메인 화면으로 이동
            } else {
                alert(data.message || '로그인에 실패했습니다.');
            }
        } catch (error) {
            console.error('Login Error:', error);
            alert('서버와 통신 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="min-h-screen bg-black relative overflow-hidden flex flex-col items-center justify-center px-4 py-6">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute w-[600px] h-[600px] -top-48 -left-48 bg-[radial-gradient(circle,rgba(0,255,133,0.15)_0%,transparent_70%)] animate-pulse" />
            </div>

            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10">
                <button onClick={() => navigate('/')} className="flex items-center gap-3 group">
                    <div className="w-12 h-12 rounded-xl bg-[rgb(0,255,133)] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Box className="w-6 h-6 text-black" />
                    </div>
                    <span className="text-2xl font-bold text-white tracking-tight">SIMVEX</span>
                </button>
            </div>

            <div className="relative z-10 w-full max-w-[420px] mt-20">
                <GlassCard className="p-8">
                    <div className="text-center mb-7">
                        <h2 className="text-3xl font-bold mb-2 text-white">로그인</h2>
                        <p className="text-base text-[rgba(255,255,255,0.6)]">학습을 계속하려면 로그인하세요</p>
                    </div>


                    <form onSubmit={handleLogin} className="space-y-4">
                        <Input type="email" label="이메일" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        <Input type="password" label="비밀번호" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        <Button type="submit" variant="primary" className="w-full justify-center h-11 text-base font-semibold mt-2">로그인</Button>
                    </form>

                    <div className="mt-6 text-center text-base">
                        <span className="text-[rgba(255,255,255,0.6)]">계정이 없으신가요? </span>
                        <button onClick={() => navigate('/signup')} className="text-[rgb(0,255,133)] hover:text-[rgb(0,230,120)] font-semibold transition-colors">회원가입</button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}