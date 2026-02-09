/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // 레퍼런스처럼 깔끔한 산세리프 폰트
            },
            colors: {
                // 레퍼런스 배경색 (아주 짙은 남색)
                'deep-space': '#05050A',
                // 레퍼런스 유리 카드 색상 (반투명)
                'glass': 'rgba(255, 255, 255, 0.05)',
                'glass-border': 'rgba(255, 255, 255, 0.1)',
                // 레퍼런스 포인트 그라데이션 컬러
                'accent-purple': '#8B5CF6', // 보라
                'accent-blue': '#3B82F6',   // 파랑
                'accent-gold': '#F59E0B',   // 금색 (이게 핵심)
            },
            backgroundImage: {
                // 배경에 은은하게 깔리는 오로라 같은 그라데이션
                'aurora': 'radial-gradient(circle at 50% 0%, rgba(59,130,246,0.15) 0%, rgba(5,5,10,0) 50%), radial-gradient(circle at 80% 20%, rgba(139,92,246,0.15) 0%, rgba(5,5,10,0) 30%)',
                'card-gradient': 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.01) 100%)',
            }
        },
    },
    plugins: [],
}