import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/Input';
import { Box } from 'lucide-react';

export default function SignupPage() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });

    const handleSignup = async (e) => { // async 추가
        e.preventDefault();

        // 1. 비밀번호 확인
        if (formData.password !== formData.confirmPassword) {
            alert('비밀번호가 일치하지 않습니다');
            return;
        }

        try {
            // 2. 백엔드로 데이터 전송
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    username: formData.name, // 백엔드는 username을 원하므로 이름 변경
                    studentId: "" // 학번은 없으면 빈 값으로 보냄
                }),
            });

            const data = await response.json();

            if (response.ok) {
                alert('회원가입이 완료되었습니다! 로그인해주세요.');
                navigate('/login'); // 성공 시 로그인 페이지로 이동
            } else {
                alert(data.message || '회원가입 실패'); // 백엔드 에러 메시지 출력
            }
        } catch (error) {
            console.error('Signup Error:', error);
            alert('서버와 연결할 수 없습니다.');
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
                <GlassCard className="p-7">
                    <div className="text-center mb-6">
                        <h2 className="text-3xl font-bold mb-2 text-white">회원가입</h2>
                        <p className="text-base text-[rgba(255,255,255,0.6)]">3D 학습을 시작하세요</p>
                    </div>

                    <form onSubmit={handleSignup} className="space-y-3.5">
                        <Input type="text" label="이름" placeholder="홍길동" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        <Input type="email" label="이메일" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                        <Input type="password" label="비밀번호" placeholder="8자 이상" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required minLength={8} />
                        <Input type="password" label="비밀번호 확인" placeholder="비밀번호 확인" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} required />
                        <Button type="submit" variant="primary" className="w-full justify-center h-11 text-base font-semibold mt-2">회원가입</Button>
                    </form>

                    <div className="mt-5 text-center text-base">
                        <span className="text-[rgba(255,255,255,0.6)]">이미 계정이 있으신가요? </span>
                        <button onClick={() => navigate('/login')} className="text-[rgb(0,255,133)] hover:text-[rgb(0,230,120)] font-semibold transition-colors">로그인</button>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}