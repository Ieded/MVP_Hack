import React, { useState, Suspense, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment, ContactShadows, TransformControls } from '@react-three/drei';
import html2pdf from 'html2pdf.js';
import * as THREE from 'three';
import {
    Box, ChevronLeft, ChevronRight,
    ZoomIn, Bookmark, BookmarkCheck,
    Download, MessageSquare, FileText, RefreshCw,
    Send, Move, Rotate3D, Maximize, Eye, EyeOff, CheckCircle, Info, User, Bot,
    PenTool, Sparkles, BookOpen, BrainCircuit
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* 3D 관련 컴포넌트 (카메라 저장, 드래그 등)                                  */
/* -------------------------------------------------------------------------- */

// 카메라 상태 저장 및 복구
function CameraPersister({ modelId, shouldReset, onResetComplete }) {
    const { camera } = useThree();
    const controls = useThree((state) => state.controls);
    const saveTimeout = useRef(null);

    useEffect(() => {
        if (shouldReset && controls) {
            camera.position.set(0.8, 0.8, 0.8);
            controls.target.set(0, 0, 0);
            controls.update();
            onResetComplete();
        }
    }, [shouldReset, camera, controls, onResetComplete]);

    useEffect(() => {
        const savedData = localStorage.getItem(`cameraState_${modelId}`);
        if (savedData && controls && !shouldReset) {
            try {
                const { position, target } = JSON.parse(savedData);
                camera.position.set(position.x, position.y, position.z);
                controls.target.set(target.x, target.y, target.z);
                controls.update();
            } catch (e) {
                console.error("카메라 상태 복구 실패:", e);
            }
        }
    }, [modelId, camera, controls]);

    useEffect(() => {
        if (!controls) return;
        const onChange = () => {
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
            saveTimeout.current = setTimeout(() => {
                const stateToSave = {
                    position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
                    target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
                };
                localStorage.setItem(`cameraState_${modelId}`, JSON.stringify(stateToSave));
            }, 500);
        };
        controls.addEventListener('change', onChange);
        return () => {
            controls.removeEventListener('change', onChange);
            if (saveTimeout.current) clearTimeout(saveTimeout.current);
        };
    }, [modelId, camera, controls]);
    return null;
}

function CameraRig({ targetPosition }) {
    const { camera, controls } = useThree();
    useFrame((state, delta) => {
        if (!targetPosition) return;
        if (controls) {
            controls.target.lerp(targetPosition, 0.1);
            controls.update();
        }
        const desiredCameraPos = new THREE.Vector3(
            targetPosition.x + 0.5, targetPosition.y + 0.5, targetPosition.z + 0.5
        );
        state.camera.position.lerp(desiredCameraPos, 0.05);
    });
    return null;
}

function DraggablePart({
                           part,
                           explosion,
                           isSelected,
                           onSelect,
                           transformMode,
                           onPartClick,
                           isVisible,
                           savedTransform,
                           onTransformChange
                       }) {
    const { scene } = useGLTF(part.url);
    const clonedScene = useMemo(() => scene.clone(), [scene]);
    const meshRef = useRef();

    useEffect(() => {
        if (meshRef.current && !savedTransform) {
            const initialRotation = part.rotation || [0, 0, 0];
            meshRef.current.rotation.set(...initialRotation);
        }
    }, [savedTransform, part.rotation]);

    if (!isVisible) return null;

    const position = savedTransform?.position || [
        part.defaultPos[0] + part.direction[0] * explosion,
        part.defaultPos[1] + part.direction[1] * explosion,
        part.defaultPos[2] + part.direction[2] * explosion
    ];

    const rotation = savedTransform?.rotation || part.rotation || [0, 0, 0];

    const handleTransformEnd = () => {
        if (meshRef.current) {
            const { position: p, rotation: r } = meshRef.current;
            onTransformChange(part.id, {
                position: [p.x, p.y, p.z],
                rotation: [r.x, r.y, r.z]
            });
        }
    };

    return (
        <>
            {isSelected && (
                <TransformControls
                    object={meshRef}
                    mode="rotate"
                    onMouseUp={handleTransformEnd}
                />
            )}
            <primitive
                ref={meshRef}
                object={clonedScene}
                position={position}
                rotation={rotation}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(part.id);
                    onPartClick(part.id);
                }}
            />
        </>
    );
}

/* -------------------------------------------------------------------------- */
/* 메인 페이지                                                                 */
/* -------------------------------------------------------------------------- */

export default function StudyPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const storageKey = `studyState_${id || 'default'}`;

    const loadState = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed[key] !== undefined ? parsed[key] : defaultValue;
            }
        } catch (e) {
            console.error("로컬 스토리지 로드 실패", e);
        }
        return defaultValue;
    };

    const [explosion, setExplosion] = useState(() => loadState('explosion', 0));
    const [selectedId, setSelectedId] = useState(null);
    const [transformMode, setTransformMode] = useState("translate");
    const [focusTarget, setFocusTarget] = useState(null);

    const [checkedGroups, setCheckedGroups] = useState(() => loadState('checkedGroups', {}));
    const [partTransforms, setPartTransforms] = useState(() => loadState('partTransforms', {}));

    const [mainTab, setMainTab] = useState(() => loadState('mainTab', 'ai'));
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    const [rightPanelWidth, setRightPanelWidth] = useState(() => loadState('rightPanelWidth', 384));

    const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
    const [isResizing, setIsResizing] = useState(false);

    const [isBookmarked, setIsBookmarked] = useState(() => {
        try {
            const savedFavorites = localStorage.getItem('favoritedModels');
            const favorites = savedFavorites ? JSON.parse(savedFavorites) : [];
            return favorites.includes(id);
        } catch (e) {
            return false;
        }
    });

    const [userNote, setUserNote] = useState(() => loadState('userNote', ''));
    const [aiInput, setAiInput] = useState('');
    const [aiHistory, setAiHistory] = useState(() => loadState('aiHistory', []));

    const [shouldResetCamera, setShouldResetCamera] = useState(false);
    const isResizingRef = useRef(false);

    const toggleBookmark = () => {
        try {
            const savedFavorites = localStorage.getItem('favoritedModels');
            let favorites = savedFavorites ? JSON.parse(savedFavorites) : [];

            if (isBookmarked) {
                favorites = favorites.filter(favId => favId !== id);
                setIsBookmarked(false);
            } else {
                if (!favorites.includes(id)) {
                    favorites.push(id);
                }
                setIsBookmarked(true);
            }
            localStorage.setItem('favoritedModels', JSON.stringify(favorites));
        } catch (e) {
            console.error("북마크 저장 실패", e);
        }
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isResizingRef.current) return;
            requestAnimationFrame(() => {
                let newWidth = window.innerWidth - e.clientX;
                const MIN_WIDTH = 250;
                const MAX_WIDTH = 800;
                if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
                if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
                setRightPanelWidth(newWidth);
            });
        };

        const handleMouseUp = () => {
            isResizingRef.current = false;
            setIsResizing(false);
            document.body.style.cursor = 'default';
            document.body.style.userSelect = 'auto';
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    const startResizing = () => {
        isResizingRef.current = true;
        setIsResizing(true);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        if (!isRightPanelOpen) setIsRightPanelOpen(true);
    };

    useEffect(() => {
        const stateToSave = {
            explosion,
            rightPanelWidth,
            partTransforms,
            checkedGroups,
            userNote,
            aiHistory,
            mainTab
        };
        localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    }, [explosion, rightPanelWidth, partTransforms, checkedGroups, userNote, aiHistory, mainTab, storageKey]);

    const handlePartTransformChange = (partId, newTransform) => {
        setPartTransforms(prev => ({
            ...prev,
            [partId]: newTransform
        }));
    };

    const handleReset = () => {
        if(window.confirm("모든 학습 상태(메모, 뷰, AI 기록)를 초기화하시겠습니까?")) {
            setExplosion(0);
            setPartTransforms({});
            setUserNote('');
            setAiHistory([]);
            setCheckedGroups({});
            setShouldResetCamera(true);

            localStorage.removeItem(storageKey);
            localStorage.removeItem(`cameraState_${id || 'default'}`);
        }
    };

    const handleAiToggle = () => {
        if (isRightPanelOpen) {
            setIsRightPanelOpen(false);
        } else {
            setMainTab('ai');
            setIsRightPanelOpen(true);
        }
    };

    // 모델 데이터
    const MODEL_DATA = {
    "1": {
        name: "Drone",
        parts: [
            { 
                id: "Main_Frame", 
                url: "/models/Drone/메인 프레임.glb", 
                defaultPos: [0, 0.1, 0], 
                direction: [0, 0, 0], 
                rotation: [-1.5646, 0, 0], 
                description: "재질: 탄소 섬유 강화 플라스틱 (CFRP)\n\n드론의 뼈대가 되는 메인 프레임입니다. 가볍지만 강철보다 강한 강성을 가지고 있어 비행 중 발생하는 진동과 충격을 효과적으로 견딥니다."
            },
            { 
                id: "Main_Frame_Mirror", 
                url: "/models/Drone/메인 프레임 좌우대칭형.glb", 
                defaultPos: [0, 0.1, 0], 
                direction: [0, 0.2, 0], 
                rotation: [-1.5646, 0, 0], 
                description: "재질: 탄소 섬유 강화 플라스틱 (CFRP)\n\n메인 프레임의 하단부로, 상단 프레임과 결합하여 내부의 전자 장비(FC, ESC, 배터리)를 보호하는 샌드위치 구조를 형성합니다."
            },
            { 
                id: "Arm_Gear_LF", 
                url: "/models/Drone/접이식 암 기어.glb", 
                defaultPos: [-0.0812, 0.0888, -0.1776], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0], 
                description: "재질: 고강도 엔지니어링 플라스틱 (PA66)\n\n좌측 전방(Front-Left) 모터를 지지하는 암(Arm)입니다. 접이식 구조로 설계되어 운반 시 부피를 줄일 수 있으며 비행 시에는 단단히 고정됩니다."
            },
            { 
                id: "Arm_Gear_RF", 
                url: "/models/Drone/접이식 암 기어.glb", 
                defaultPos: [0.0812, 0.0888, -0.1776], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 고강도 엔지니어링 플라스틱 (PA66)\n\n우측 전방(Front-Right) 모터를 지지하는 암입니다. 모터의 진동이 메인 프레임으로 전달되는 것을 최소화하는 구조적 특징을 가집니다."
            },
            { 
                id: "Arm_Gear_LB", 
                url: "/models/Drone/접이식 암 기어.glb", 
                defaultPos: [-0.0974, 0.0882, 0.0148], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 고강도 엔지니어링 플라스틱 (PA66)\n\n좌측 후방(Rear-Left) 암입니다. 드론의 대각선 축 길이를 결정하여 비행 안정성에 직접적인 영향을 미칩니다."
            },
            { 
                id: "Arm_Gear_RB", 
                url: "/models/Drone/접이식 암 기어.glb", 
                defaultPos: [0.0974, 0.0882, 0.0148], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 고강도 엔지니어링 플라스틱 (PA66)\n\n우측 후방(Rear-Right) 암입니다. 4개의 암이 정확한 대칭을 이루어야 호버링(정지 비행) 시 기체가 한쪽으로 쏠리지 않습니다."
            },
            { 
                id: "Gearing_Unit_LF", 
                url: "/models/Drone/기어 세트.glb", 
                defaultPos: [-0.0733, 0.0834, -0.1667], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리아세탈 (POM)\n\n모터의 회전력을 프로펠러로 전달하는 기어 유닛입니다. 마찰 계수가 낮은 POM 소재를 사용하여 동력 손실을 최소화합니다."
            },
            { 
                id: "Gearing_Unit_RF", 
                url: "/models/Drone/기어 세트.glb", 
                defaultPos: [0.0733, 0.0834, -0.1667], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리아세탈 (POM)\n\n우측 전방 기어 세트입니다. 정밀하게 가공된 기어 톱니는 소음을 줄이고 에너지 전달 효율을 극대화합니다."
            },
            { 
                id: "Gearing_Unit_LB", 
                url: "/models/Drone/기어 세트.glb", 
                defaultPos: [-0.0850, 0.0824, 0.0093], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리아세탈 (POM)\n\n좌측 후방 기어 세트입니다. 비행 중 지속적인 고속 회전 마찰을 견딜 수 있도록 내마모성이 우수한 소재가 사용됩니다."
            },
            { 
                id: "Gearing_Unit_RB", 
                url: "/models/Drone/기어 세트.glb", 
                defaultPos: [0.0850, 0.0824, 0.0093], 
                direction: [0, 0.2, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리아세탈 (POM)\n\n우측 후방 기어 세트입니다. 기어의 맞물림(Backlash)이 적절해야 부드러운 비행이 가능합니다."
            },
            { 
                id: "Beater_Disc", 
                url: "/models/Drone/로터 플레이트.glb", 
                defaultPos: [0.0000, 0.1009, -0.1637], 
                direction: [0, 0.1, 0], 
                rotation: [-0.0000, -1.5463, 1.5650],
                description: "재질: 알루미늄 합금 (6061)\n\n프로펠러와 모터 축을 연결하는 로터 허브 플레이트입니다. 고속 회전 시 원심력을 견디며 블레이드를 단단히 고정합니다."
            },
            { 
                id: "Impellar_Blade_LF", 
                url: "/models/Drone/프로펠러 블레이드.glb", 
                defaultPos: [-0.0809, 0.1091, -0.1778], 
                direction: [0, 0.3, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리카보네이트 (Polycarbonate)\n\n공기 역학적으로 설계된 프로펠러 블레이드입니다. 시계 방향(CW) 또는 반시계 방향(CCW)으로 회전하며 양력을 발생시킵니다."
            },
            { 
                id: "Impellar_Blade_RF", 
                url: "/models/Drone/프로펠러 블레이드.glb", 
                defaultPos: [0.0809, 0.1091, -0.1778], 
                direction: [0, 0.3, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리카보네이트 (Polycarbonate)\n\n우측 전방 프로펠러입니다. 드론은 대각선에 위치한 프로펠러끼리 같은 방향으로 회전하여 토크(Torque)를 상쇄시킵니다."
            },
            { 
                id: "Impellar_Blade_LB", 
                url: "/models/Drone/프로펠러 블레이드.glb", 
                defaultPos: [-0.0975, 0.1085, 0.0147], 
                direction: [0, 0.3, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리카보네이트 (Polycarbonate)\n\n좌측 후방 프로펠러입니다. 끝부분의 윙렛(Winglet) 설계는 와류(Vortex)를 줄여 비행 소음을 감소시키고 효율을 높입니다."
            },
            { 
                id: "Impellar_Blade_RB", 
                url: "/models/Drone/프로펠러 블레이드.glb", 
                defaultPos: [0.0975, 0.1085, 0.0147], 
                direction: [0, 0.3, 0], 
                rotation: [0, 0, 0],
                description: "재질: 폴리카보네이트 (Polycarbonate)\n\n우측 후방 프로펠러입니다. 충격에 강한 폴리카보네이트 소재를 사용하여 파손 위험을 줄였습니다."
            },
            { 
                id: "Support_Leg_LF", 
                url: "/models/Drone/랜딩 레그.glb", 
                defaultPos: [-0.0812, 0.1000, -0.1776], 
                direction: [0, 0.1, 0], 
                rotation: [0.0000, 0.6391, 0.0000],
                description: "재질: 열가소성 폴리우레탄 (TPU)\n\n착륙 시 지면과의 충격을 완화하고 기체 하단부의 카메라나 센서를 보호하는 연질 랜딩 기어입니다."
            },
            { 
                id: "Support_Leg_RF", 
                url: "/models/Drone/랜딩 레그.glb", 
                defaultPos: [0.0812, 0.1000, -0.1776], 
                direction: [0, 0.1, 0], 
                rotation: [0.0000, -0.6391, 0.0000],
                description: "재질: 열가소성 폴리우레탄 (TPU)\n\n우측 전방 랜딩 레그입니다. 마찰력이 높은 소재를 사용하여 경사지나 미끄러운 표면에서도 안정적인 이착륙을 돕습니다."
            },
            { 
                id: "Support_Leg_LB", 
                url: "/models/Drone/랜딩 레그.glb", 
                defaultPos: [-0.0973, 0.0990, 0.0146], 
                direction: [0, 0.1, 0], 
                rotation: [-3.1416, 1.1787, -3.1416],
                description: "재질: 열가소성 폴리우레탄 (TPU)\n\n좌측 후방 랜딩 레그입니다. 탄성이 있어 반복적인 착륙 충격에도 파손되지 않도록 설계되었습니다."
            },
            { 
                id: "Support_Leg_RB", 
                url: "/models/Drone/랜딩 레그.glb", 
                defaultPos: [0.0973, 0.0990, 0.0146], 
                direction: [0, 0.1, 0], 
                rotation: [-3.1416, -1.1787, -3.1416],
                description: "재질: 열가소성 폴리우레탄 (TPU)\n\n우측 후방 랜딩 레그입니다. 기체의 무게 중심을 고려하여 배치되었으며 안정적인 지지를 제공합니다."
            },
            { 
                id: "Fixing_Screw_LF", 
                url: "/models/Drone/체결 나사.glb", 
                defaultPos: [-0.0515, 0.0948, -0.1369], 
                direction: [0, -0.1, 0], 
                rotation: [0.0000, 0.0000, -3.15],
                description: "재질: 스테인리스 스틸 (SUS304)\n\n부품들을 결합하는 고장력 나사입니다. 비행 진동에 의해 풀리지 않도록 나사산에 풀림 방지 처리가 되어 있습니다."
            },
            { 
                id: "Fixing_Screw_RF", 
                url: "/models/Drone/체결 나사.glb", 
                defaultPos: [0.0515, 0.0948, -0.1369], 
                direction: [0, -0.1, 0], 
                rotation: [0.0000, 0.0000, -3.15],
                description: "재질: 스테인리스 스틸 (SUS304)\n\n우측 전방 부품 고정 나사입니다. 부식에 강한 스테인리스 소재를 사용하여 야외 비행 환경에 적합합니다."
            },
            { 
                id: "Fixing_Screw_LB", 
                url: "/models/Drone/체결 나사.glb", 
                defaultPos: [0.0513, 0.0939, -0.0051], 
                direction: [0, -0.1, 0], 
                rotation: [0.0000, 0.0000, -3.15],
                description: "재질: 스테인리스 스틸 (SUS304)\n\n후방 부품 결합용 나사입니다. 정밀한 체결력을 유지하기 위해 규격에 맞는 도구를 사용해야 합니다."
            },
            { 
                id: "Fixing_Screw_RB", 
                url: "/models/Drone/체결 나사.glb", 
                defaultPos: [-0.0513, 0.0939, -0.0051], 
                direction: [0, -0.1, 0], 
                rotation: [0.0000, 0.0000, -3.15],
                description: "재질: 스테인리스 스틸 (SUS304)\n\n우측 후방 고정 나사입니다. 작은 부품이지만 기체의 전체적인 결합 강성을 유지하는 중요한 역할을 합니다."
            },
            { 
                id: "Fixing_Nut_LF", 
                url: "/models/Drone/프로펠러 고정 너트.glb", 
                defaultPos: [-0.0514, 0.1061, -0.1372], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 알루미늄 합금 (아노다이징 처리)\n\n프로펠러가 고속 회전 중에도 이탈하지 않도록 고정하는 너트입니다. 회전 방향과 반대로 조여지는 역나사 방식이 적용될 수 있습니다."
            },
            { 
                id: "Fixing_Nut_RF", 
                url: "/models/Drone/프로펠러 고정 너트.glb", 
                defaultPos: [0.0514, 0.1061, -0.1372], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 알루미늄 합금 (아노다이징 처리)\n\n우측 전방 프로펠러 고정 너트입니다. 비행 전 항상 조임 상태를 점검해야 하는 안전 필수 부품입니다."
            },
            { 
                id: "Fixing_Nut_LB", 
                url: "/models/Drone/프로펠러 고정 너트.glb", 
                defaultPos: [-0.0514, 0.1061, -0.0048], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 알루미늄 합금 (아노다이징 처리)\n\n좌측 후방 너트입니다. 모터의 회전 방향(CW/CCW)을 구분하기 위해 색상을 다르게 적용하기도 합니다."
            },
            { 
                id: "Fixing_Nut_RB", 
                url: "/models/Drone/프로펠러 고정 너트.glb", 
                defaultPos: [0.0514, 0.1061, -0.0048], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 알루미늄 합금 (아노다이징 처리)\n\n우측 후방 너트입니다. 경량화를 위해 알루미늄 소재를 사용하며 내식성을 위해 아노다이징 처리되었습니다."
            },
            { 
                id: "xyz", 
                url: "/models/Drone/모터 하우징.glb", 
                defaultPos: [0.0001, 0.0833, -0.0786], 
                direction: [0, 0.1, 0], 
                rotation: [0, 0, 0],
                description: "재질: 내열 ABS 플라스틱\n\n모터를 보호하고 내부의 열을 방출하는 하우징 커버입니다. 먼지나 이물질 유입을 막아 모터 수명을 연장시킵니다."
            },
        ]
    },
    "2": {
        name: "LeafSpring",
        parts: [
            { 
                id: "Chassis", 
                url: "/models/LeafSpring/섀시 서포트 브라켓.glb", 
                defaultPos: [-0.0064, 0.2511, -0.6397], 
                direction: [0, 0.6, 0], 
                rotation: [3.1402, 0.0000, 0.0000],
                description: "재질: 구조용 강철 (Structural Steel)\n\n차량의 프레임에 연결되는 섀시 서포트입니다. 판스프링 시스템 전체를 차체에 고정하며 하중을 전달받는 주요 구조물입니다."
            },
            { 
                id: "Chassis_Rigid", 
                url: "/models/LeafSpring/섀시 고정 서포트.glb", 
                defaultPos: [-0.0081, 0.1658, 0.4534], 
                direction: [0, 0.6, 0], 
                rotation: [-3.1381, 0.0000, 0.0000],
                description: "재질: 구조용 강철 (Structural Steel)\n\n판스프링의 반대쪽 끝을 차체에 고정하는 서포트입니다. 주행 중 발생하는 비틀림 강성을 견딜 수 있도록 설계되었습니다."
            },
            { 
                id: "Leaf_Layer", 
                url: "/models/LeafSpring/판스프링 리프.glb", 
                defaultPos: [0, 0.13, 0], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 스프링강 (Spring Steel, SUP9)\n\n탄성이 뛰어난 금속 판들을 겹쳐 만든 리프(Leaf) 묶음입니다. 충격을 흡수하고 차량의 무게를 지탱하는 핵심 서스펜션 부품입니다."
            },
            { 
                id: "Clamp_Center", 
                url: "/models/LeafSpring/센터 클램프.glb", 
                defaultPos: [0.0798, 0.0535, -0.0008], 
                direction: [0, 0, 0], 
                rotation: [0, 0, 0],
                description: "재질: 탄소강 (Carbon Steel)\n\n여러 겹의 스프링 판들이 흩어지지 않도록 중앙에서 강력하게 잡아주는 센터 클램프입니다. 차축(Axle)과 연결되는 부위이기도 합니다."
            },
            { 
                id: "Clamp_Primary_L", 
                url: "/models/LeafSpring/메인 클램프.glb", 
                defaultPos: [0.0837, 0.0632, 0.1287], 
                direction: [0, 0.8, 1.2], 
                rotation: [-0.0650, 0.0000, 0.0000],
                description: "재질: 탄소강 (Carbon Steel)\n\n스프링의 좌측 부분을 고정하는 메인 U-볼트 클램프입니다. 수직 하중뿐만 아니라 주행 시 발생하는 전단력을 지지합니다."
            },
            { 
                id: "Clamp_Primary_R", 
                url: "/models/LeafSpring/메인 클램프.glb", 
                defaultPos: [0.0837, 0.0632, -0.1287], 
                direction: [0, 0.8, -1.4], 
                rotation: [0.0650, 0.0000, 0.0000],
                description: "재질: 탄소강 (Carbon Steel)\n\n스프링의 우측 부분을 고정하는 메인 U-볼트 클램프입니다. 판스프링이 차축에서 이탈하지 않도록 견고하게 잡아줍니다."
            },
            { 
                id: "Clamp_Secondary_L", 
                url: "/models/LeafSpring/보조 클램프.glb", 
                defaultPos: [0.0835, 0.0928, 0.2816], 
                direction: [0, 0.8, 1.2], 
                rotation: [-0.1597, 0.0000, 0.0000],
                description: "재질: 연강 (Mild Steel)\n\n스프링 판들이 상하 운동을 할 때 옆으로 틀어지는 것을 방지하는 보조 클램프(리바운드 클립)입니다."
            },
            { 
                id: "Clamp_Secondary_R", 
                url: "/models/LeafSpring/보조 클램프.glb", 
                defaultPos: [0.0837, 0.0961, -0.2731], 
                direction: [0, 0.8, -1.4], 
                rotation: [0.1597, 0.0000, 0.0000],
                description: "재질: 연강 (Mild Steel)\n\n우측 보조 클램프입니다. 급격한 코너링이나 험로 주행 시 스프링 잎들의 정렬 상태를 유지시켜 줍니다."
            },
            { 
                id: "SupportL", 
                url: "/models/LeafSpring/서포트 브라켓.glb", 
                defaultPos: [0.0775, 0.2105, -0.5994], 
                direction: [0.1, 0, 0], 
                rotation: [1.9142, -1.5582, 3.1416],
                description: "재질: 주강 (Cast Steel)\n\n판스프링의 끝단과 차체를 연결하는 브라켓입니다. 스프링이 눌릴 때 길이가 변할 수 있도록 유동적인 움직임을 허용하는 구조입니다."
            },
            { 
                id: "SupportR", 
                url: "/models/LeafSpring/서포트 브라켓.glb", 
                defaultPos: [-0.0006, 0.2562, -0.5829], 
                direction: [-0.1, 0, 0], 
                rotation: [1.9142, 1.5582, 3.1416],
                description: "재질: 주강 (Cast Steel)\n\n반대쪽 고정 브라켓입니다. 스프링의 상하 운동을 지지하며 차체로 전달되는 충격을 1차적으로 받아냅니다."
            },
            { 
                id: "Rubber", 
                url: "/models/LeafSpring/고무 부싱.glb", 
                defaultPos: [0.0074, 0.2494, -0.6404], 
                direction: [0, 0, -0.1], 
                rotation: [0, 0, 0],
                description: "재질: 강화 고무 또는 우레탄\n\n금속 부품 간의 마찰과 소음을 줄이고 미세한 진동을 흡수하는 고무 부싱(Bushing)입니다. 승차감을 개선하는 중요한 부품입니다."
            },
        ]
    },
    "3": {
        name: "MachineVice",
        parts: [
            { 
                id: "Fuhrung", 
                url: "/models/MachineVice/슬라이드 가이드 블록.glb", 
                defaultPos: [-0.1601, 0.1301, -0.0107], 
                direction: [0, 0.1, 0], 
                rotation: [-1.5724, 0.0000, 0.0000],
                description: "재질: 합금강 (Alloy Steel)\n\n이동 죠(Moving Jaw)가 흔들림 없이 직선으로 움직이도록 안내하는 가이드 블록입니다. 정밀 가공 시 오차를 줄여줍니다."
            },
            { 
                id: "Part2m", 
                url: "/models/MachineVice/고정 죠.glb", 
                defaultPos: [-0.1854, 0.0996, -0.0004], 
                direction: [0, 0.2, 0], 
                rotation: [3.1347, 1.5686, -3.1402],
                description: "재질: 회주철 (Grey Cast Iron)\n\n바이스 본체에 고정되어 움직이지 않는 죠(Fixed Jaw)입니다. 진동 흡수성이 좋은 주철로 만들어져 가공 정밀도를 높여줍니다."
            },
            { 
                id: "Part3m", 
                url: "/models/MachineVice/이동 죠.glb", 
                defaultPos: [-0.0456, 0.1361, -0.0005], 
                direction: [0, 0.2, 0], 
                rotation: [0.0000, 1.5678, 0.0000],
                description: "재질: 회주철 (Grey Cast Iron)\n\n스핀들의 회전에 따라 앞뒤로 움직이며 공작물을 물어주는 이동 죠(Moving Jaw)입니다."
            },
            { 
                id: "Part4m", 
                url: "/models/MachineVice/스핀들 지지 블록.glb", 
                defaultPos: [-0.0201, 0.1001, -0.0205], 
                direction: [0, 0.2, 0], 
                rotation: [0.0000, 1.5662, 0.0000],
                description: "재질: 탄소강\n\n스크류 스핀들을 지지하여 회전력을 직선 운동으로 원활하게 변환할 수 있게 돕는 베어링 블록입니다."
            },
            { 
                id: "Part5-1m", 
                url: "/models/MachineVice/클램핑 죠 인서트.glb", 
                defaultPos: [-0.0885, 0.1361, -0.0765], 
                direction: [0, 0.3, 0], 
                rotation: [0.0000, -1.5670, 0.0000],
                description: "재질: 경화강 (Hardened Steel)\n\n이동 죠의 표면에 부착되는 교체형 인서트입니다. 공작물을 꽉 물 수 있도록 표면에 널링(Knurling) 처리가 되어 있을 수 있습니다."
            },
            { 
                id: "Part5-2m", 
                url: "/models/MachineVice/클램핑 죠 인서트.glb", 
                defaultPos: [-0.1678, 0.1353, 0.0001], 
                direction: [0, 0.3, 0], 
                rotation: [-3.1416, 1.5658, -3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n고정 죠에 부착되는 인서트입니다. 마모되었을 때 전체 죠를 교체할 필요 없이 이 부분만 교체하면 되어 경제적입니다."
            },
            { 
                id: "Part6-1m", 
                url: "/models/MachineVice/가이드 레일.glb", 
                defaultPos: [-0.0455, 0.1202, -0.0004], 
                direction: [0, 0.17, 0], 
                rotation: [1.5610, -0.0001, -3.1347],
                description: "재질: 고탄소강 (High Carbon Steel)\n\n바이스의 이동 부품들이 정해진 경로를 벗어나지 않도록 잡아주는 정밀 가이드 레일입니다. 내마모성을 위해 열처리됩니다."
            },
            { 
                id: "Part6-2m", 
                url: "/models/MachineVice/가이드 레일.glb", 
                defaultPos: [-0.0953, 0.1202, -0.0757], 
                direction: [0, 0.17, 0], 
                rotation: [1.5806, 0.0001, 0.0048],
                description: "재질: 고탄소강 (High Carbon Steel)\n\n반대쪽 가이드 레일입니다. 마찰을 줄이고 부드러운 움직임을 위해 윤활유가 도포되는 부분입니다."
            },
            { 
                id: "Part7m", 
                url: "/models/MachineVice/트라페조이드 리드 스크류.glb", 
                defaultPos: [0.0756, 0.1442, -0.0381], 
                direction: [0.3, 0, 0], 
                rotation: [-3.1416, 1.5688, -3.1416],
                description: "재질: 합금강 (Alloy Steel)\n\n핸들을 돌리는 회전력을 강력한 직선 조임력으로 변환해주는 사다리꼴 나사(Lead Screw)입니다. 바이스의 핵심 동력 전달 부품입니다."
            },
            { 
                id: "Part8m", 
                url: "/models/MachineVice/베이스 플레이트.glb", 
                defaultPos: [0, 0.1, 0], 
                direction: [0, 0, 0], 
                rotation: [1.5758, -0.0000, -3.1402],
                description: "재질: 회주철 (Grey Cast Iron)\n\n바이스의 바닥판입니다. 공작 기계의 테이블에 바이스를 고정하는 역할을 하며, 진동을 흡수하는 무거운 재질로 만들어집니다."
            },
            { 
                id: "Part9m", 
                url: "/models/MachineVice/압력 슬리브.glb", 
                defaultPos: [-0.0443, 0.1442, -0.0378], 
                direction: [0.03, 0.2, 0], 
                rotation: [3.1416, -1.5640, 3.1416],
                description: "재질: 인청동 또는 강철\n\n스크류의 미는 힘을 이동 죠에 균일하게 전달하는 압력 슬리브입니다. 마찰을 줄이는 베어링 역할을 하기도 합니다."
            },
        ]
    },
    "4": {
        name: "RobotArm",
        parts: [
            { 
                id: "Baser", 
                url: "/models/RobotArm/로봇 베이스.glb", 
                defaultPos: [0, 0, 0], 
                direction: [0, 0, 0], 
                rotation: [0, 0, 0],
                description: "재질: 주철 또는 강철\n\n로봇 팔 전체를 바닥이나 작업대에 고정하는 베이스입니다. 로봇의 무게와 동작 시 발생하는 반동을 견고하게 지지합니다."
            },
            { 
                id: "Part2r", 
                url: "/models/RobotArm/베이스 회전 조인트.glb", 
                defaultPos: [0.0000, 0.0821, -0.0000], 
                direction: [0, 0.3, 0], 
                rotation: [0.0000, 1.5550, 0.0000],
                description: "재질: 알루미늄 합금\n\n로봇 팔의 1축(Axis 1)에 해당하며, 몸통 전체를 좌우로 회전시키는 관절 모듈입니다."
            },
            { 
                id: "Part3r", 
                url: "/models/RobotArm/하부 암.glb", 
                defaultPos: [0.1498, 0.2422, 0.0222], 
                direction: [0, 0.3, 0.2], 
                rotation: [1.5615, -0.6519, -0.0056],
                description: "재질: 알루미늄 합금\n\n로봇의 어깨 관절(Axis 2)과 연결된 하부 암(Lower Arm)입니다. 앞뒤로 움직이며 로봇의 작업 반경을 크게 결정하는 주요 링크입니다."
            },
            { 
                id: "Part4r", 
                url: "/models/RobotArm/엘보 조인트.glb", 
                defaultPos: [-0.1810, 0.4973, -0.0253], 
                direction: [0, 0.3, 0], 
                rotation: [-1.9292, 1.5260, 1.9288],
                description: "재질: 알루미늄 합금\n\n하부 암과 상부 암을 연결하는 팔꿈치(Axis 3) 관절입니다. 상하 움직임을 제어하여 높이와 거리를 조절합니다."
            },
            { 
                id: "Part5r", 
                url: "/models/RobotArm/상부 암.glb", 
                defaultPos: [0.1150, 0.5099, -0.0298], 
                direction: [0.2, 0.3, 0], 
                rotation: [-1.6017, 1.5257, 1.6016],
                description: "재질: 알루미늄 합금 또는 탄소섬유\n\n로봇의 상부 암(Upper Arm)입니다. 팔뚝 회전(Axis 4) 기능을 포함하여 복잡한 각도의 작업이 가능하게 합니다."
            },
            { 
                id: "Part6r", 
                url: "/models/RobotArm/손목 회전 조인트.glb", 
                defaultPos: [0.2629, 0.4971, -0.0299], 
                direction: [0.3, 0, 0], 
                rotation: [-1.5645, 0.4378, 1.5615],
                description: "재질: 알루미늄 합금\n\n손목을 위아래 또는 좌우로 꺾어주는 손목 관절(Axis 5)입니다. 말단 장치(End Effector)의 각도를 정밀하게 제어합니다."
            },
            { 
                id: "Part7r", 
                url: "/models/RobotArm/손목 암.glb", 
                defaultPos: [0.3098, 0.4755, -0.0293], 
                direction: [0.4, -0.05, 0], 
                rotation: [1.5474, 1.1308, -1.5497],
                description: "재질: 알루미늄 합금\n\n그리퍼가 부착되는 최종 손목 회전축(Axis 6)입니다. 360도 회전이 가능하여 물체의 방향을 자유롭게 조작할 수 있습니다."
            },
            { 
                id: "Part8-1r", 
                url: "/models/RobotArm/그리퍼.glb", 
                defaultPos: [0.3946, 0.4257, 0.0010], 
                direction: [0.5, -0.09, 0.1], 
                rotation: [-1.5636, 0.4342, 1.2922],
                description: "재질: 스테인리스 스틸 또는 알루미늄\n\n물건을 집거나 작업을 수행하는 말단 장치(End Effector)의 한쪽 날입니다. 용도에 따라 다양한 형태로 교체될 수 있습니다."
            },
            { 
                id: "Part8-2r", 
                url: "/models/RobotArm/그리퍼.glb", 
                defaultPos: [0.4023, 0.4414, -0.0569], 
                direction: [0.5, -0.09, -0.1], 
                rotation: [1.5767, -0.4456, 1.3316],
                description: "재질: 스테인리스 스틸 또는 알루미늄\n\n그리퍼의 반대쪽 날입니다. 공압이나 전동 모터에 의해 오므려지며 물체를 정밀하게 파지합니다."
            },
        ]
    },
    "5": {
        name: "RobotGripper",
        parts: [
            { 
                id: "base_gear", 
                url: "/models/RobotGripper/구동 기어.glb", 
                defaultPos: [0.0076, 0.0178, -0.0027], 
                direction: [0, 0, 0.05], 
                rotation: [0.0000, -1.5706, 0.0000],
                description: "재질: 황동 또는 강철\n\n모터의 회전을 받아 그리퍼를 작동시키는 메인 구동 기어입니다. 내구성을 위해 금속 소재가 주로 사용됩니다."
            },
            { 
                id: "mounting_bracket", 
                url: "/models/RobotGripper/베이스 장착 브라켓.glb", 
                defaultPos: [0.0101, -0.0053, 0.0060], 
                direction: [0, 0, 0.1], 
                rotation: [-0.1133, 1.5241, 1.6775],
                description: "재질: 알루미늄 합금\n\n그리퍼 모듈 전체를 로봇 팔의 손목 부위에 연결하는 마운팅 브라켓입니다. 경량화를 위해 알루미늄이 선호됩니다."
            },
            { 
                id: "base_plate", 
                url: "/models/RobotGripper/베이스 플레이트.glb", 
                defaultPos: [0, 0, 0], 
                direction: [0, 0, 0], 
                rotation: [0, 0, 0],
                description: "재질: 알루미늄 합금\n\n기어, 링크, 죠 등 모든 그리퍼 부품이 조립되는 바닥판입니다. 전체 구조의 강성을 담당합니다."
            },
            { 
                id: "gear_link_1", 
                url: "/models/RobotGripper/기어 연동 링크 1.glb", 
                defaultPos: [0.0136, 0.0378, 0.0048], 
                direction: [0.05, 0.05, 0], 
                rotation: [1.5754, -0.0569, -1.5434],
                description: "재질: 스테인리스 스틸\n\n회전 운동을 집게의 직선 또는 오므리는 운동으로 변환해주는 1차 링크입니다."
            },
            { 
                id: "gear_link_2", 
                url: "/models/RobotGripper/기어 연동 링크 2.glb", 
                defaultPos: [-0.0136, 0.0378, 0.0062], 
                direction: [-0.05, 0.05, 0], 
                rotation: [-3.1374, -0.0061, -1.7756],
                description: "재질: 스테인리스 스틸\n\n반대쪽 집게를 작동시키는 대칭형 링크입니다. 양쪽 집게가 동시에 움직이도록 동기화합니다."
            },
            { 
                id: "link_L", 
                url: "/models/RobotGripper/링크 암.glb", 
                defaultPos: [-0.0064, 0.0740, 0.0048], 
                direction: [-0.05, 0.1, 0], 
                rotation: [-1.5713, -0.0883, -1.5496],
                description: "재질: 알루미늄 합금\n\n기어 링크와 그리퍼 죠를 연결하는 중간 링크 암입니다. 지렛대 원리를 이용해 파지력을 증대시킵니다."
            },
            { 
                id: "link_R", 
                url: "/models/RobotGripper/링크 암.glb", 
                defaultPos: [0.0060, 0.0739, 0.0049], 
                direction: [0.05, 0.1, 0], 
                rotation: [-1.5634, 0.0671, -1.5615],
                description: "재질: 알루미늄 합금\n\n우측 링크 암입니다. 정밀한 공차로 제작되어야 그리퍼 끝단의 유격이 줄어듭니다."
            },
            { 
                id: "gripper_L", 
                url: "/models/RobotGripper/그리퍼 죠.glb", 
                defaultPos: [-0.0031, 0.0870, 0.0000], 
                direction: [-0.05, 0.05, -0.05], 
                rotation: [-0.0002, 0.0284, 1.1878],
                description: "재질: 알루미늄 (고무 패드 부착 가능)\n\n실제로 물체와 접촉하는 좌측 죠(Jaw)입니다. 표면 마찰력을 높이기 위해 고무 패드가 부착되기도 합니다."
            },
            { 
                id: "gripper_R", 
                url: "/models/RobotGripper/그리퍼 죠.glb", 
                defaultPos: [0.0027, 0.0870, 0.0012], 
                direction: [0.05, 0.05, -0.05], 
                rotation: [-3.1414, -0.0374, -1.9538],
                description: "재질: 알루미늄 (고무 패드 부착 가능)\n\n우측 죠입니다. 평행 개폐형(Parallel) 또는 부채꼴 개폐형(Angular)으로 동작합니다."
            },
            { 
                id: "Pin_01", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [0.0052, 0.0585, 0.0024], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n각 링크들의 관절 역할을 하는 힌지 핀입니다. 마모를 줄이기 위해 표면 경화 처리되었습니다."
            },
            { 
                id: "Pin_02", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [-0.0075, 0.0895, 0.0024], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n링크 연결부 핀입니다. 스냅 링(E-ring) 등으로 빠지지 않게 고정됩니다."
            },
            { 
                id: "Pin_03", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [0.0154, 0.0689, 0.0020], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n주요 관절 핀입니다. 반복적인 움직임에도 마모되지 않도록 높은 경도를 가집니다."
            },
            { 
                id: "Pin_04", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [-0.0154, 0.0689, 0.0020], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n대칭되는 위치의 힌지 핀입니다."
            },
            { 
                id: "Pin_05", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [0.0073, 0.0894, 0.0024], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n그리퍼 죠의 움직임을 지지하는 핀입니다."
            },
            { 
                id: "Pin_06", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [-0.0136, 0.0377, 0.0025], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n구동 기어와 링크를 연결하는 핀입니다."
            },
            { 
                id: "Pin_07", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [0.0141, 0.0377, 0.0025], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n반대쪽 구동 연결 핀입니다."
            },
            { 
                id: "Pin_08", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [-0.0048, 0.0584, 0.0024], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n중간 링크 연결 핀입니다."
            },
            { 
                id: "Pin_09", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [0.0053, 0.0034, 0.0022], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n베이스 플레이트 고정용 핀일 수 있습니다."
            },
            { 
                id: "Pin_10", 
                url: "/models/RobotGripper/힌지 핀.glb", 
                defaultPos: [-0.0053, 0.0034, 0.0022], 
                direction: [0, 0, 0.2], 
                rotation: [3.1416, -1.5402, 3.1416],
                description: "재질: 경화강 (Hardened Steel)\n\n마지막 연결 핀입니다. 모든 핀은 정밀한 동작을 위해 유격 없이 조립되어야 합니다."
            },
        ]
    },
    "6": {
        name: "Suspension",
        parts: [
            { 
                id: "Bases", 
                url: "/models/Suspension/하부 마운트.glb", 
                defaultPos: [0, 0.028, 0], 
                direction: [0, 0, 0], 
                rotation: [0.6156, 0.0000, 0.0000],
                description: "재질: 강철 또는 알루미늄 합금\n\n서스펜션의 하단부를 바퀴 축이나 컨트롤 암에 고정하는 베이스 마운트입니다."
            },
            { 
                id: "Nut", 
                url: "/models/Suspension/조절 너트.glb", 
                defaultPos: [0.0000, 0.1118, 0.0589], 
                direction: [0, 0.28, 0.2], 
                rotation: [0.6171, 0.0000, 0.0000],
                description: "재질: 강철 (아연 도금)\n\n스프링의 압축 강도(Preload)를 조절하는 너트입니다. 차량의 높이나 승차감을 튜닝할 때 사용합니다."
            },
            { 
                id: "Rod", 
                url: "/models/Suspension/피스톤 로드.glb", 
                defaultPos: [-0.0001, 0.1198, 0.0646], 
                direction: [0, 0.14, 0.1], 
                rotation: [0.6156, 0.0000, 0.0000],
                description: "재질: 크롬 도금 강철\n\n쇽업쇼버 내부의 오일이나 가스를 통과하며 진동을 억제하는 피스톤 로드입니다. 내마모성을 위해 표면이 매우 매끄럽게 처리되었습니다."
            },
            { 
                id: "Spring", 
                url: "/models/Suspension/코일 스프링.glb", 
                defaultPos: [-0.0001, 0.0306, 0.0015], 
                direction: [0, 0.07, 0.05], 
                rotation: [0.6156, 0.0000, 0.0000],
                description: "재질: 스프링강 (SiCr Steel)\n\n노면의 충격을 1차적으로 흡수하여 차체를 지지하는 코일 스프링입니다. 탄성 계수에 따라 서스펜션의 특성이 달라집니다."
            },
        ]
    },
    "7": {
        name: "V4_Engine",
        parts: [
            { 
                id: "CRodCap1", 
                url: "/models/V4_Engine/커넥팅 로드 캡.glb", 
                defaultPos: [0.1557, 0.1741, 0.0355], 
                direction: [0, -0.1, 0], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n커넥팅 로드의 하단을 크랭크축에 고정하는 캡입니다. 내부에는 마찰을 줄이기 위한 베어링 메탈이 장착됩니다."
            },
            { 
                id: "CRodCap2", 
                url: "/models/V4_Engine/커넥팅 로드 캡.glb", 
                defaultPos: [0.2708, 0.2261, -0.0355], 
                direction: [0, -0.1, 0], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n2번 실린더의 커넥팅 로드 캡입니다. 고속 회전 시 발생하는 엄청난 인장 하중을 견뎌야 합니다."
            },
            { 
                id: "CRodCap3", 
                url: "/models/V4_Engine/커넥팅 로드 캡.glb", 
                defaultPos: [0.3838, 0.2261, -0.0355], 
                direction: [0, -0.1, 0], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n3번 실린더용 캡입니다. 조립 시 짝이 맞는 로드와 정확한 방향으로 체결해야 합니다."
            },
            { 
                id: "CRodCap4", 
                url: "/models/V4_Engine/커넥팅 로드 캡.glb", 
                defaultPos: [0.4984, 0.1741, 0.0355], 
                direction: [0, -0.1, 0], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n4번 실린더용 캡입니다. V4 엔진의 특성상 강한 내구성이 요구되는 부품입니다."
            },
            { 
                id: "CRod1", 
                url: "/models/V4_Engine/커넥팅 로드.glb", 
                defaultPos: [0.1557, 0.3712, -0.0042], 
                direction: [0, 0.3, -0.03], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n피스톤의 직선 왕복 운동을 크랭크축의 회전 운동으로 변환해주는 커넥팅 로드입니다. 높은 강성과 인성이 필수적입니다."
            },
            { 
                id: "CRod2", 
                url: "/models/V4_Engine/커넥팅 로드.glb", 
                defaultPos: [0.2708, 0.4240, 0.0008], 
                direction: [0, 0.3, 0.03], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n2번 피스톤과 연결되는 로드입니다. 강성을 유지하면서도 관성력을 줄이기 위해 I형 단면으로 제작됩니다."
            },
            { 
                id: "CRod3", 
                url: "/models/V4_Engine/커넥팅 로드.glb", 
                defaultPos: [0.3838, 0.4240, 0.0008], 
                direction: [0, 0.3, 0.03], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n3번 피스톤 로드입니다. 고성능 엔진에서는 티타늄 합금이 사용되기도 합니다."
            },
            { 
                id: "CRod4", 
                url: "/models/V4_Engine/커넥팅 로드.glb", 
                defaultPos: [0.4984, 0.3712, -0.0042], 
                direction: [0, 0.3, -0.03], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 단조강 (Forged Steel)\n\n4번 피스톤 로드입니다. 엔진의 폭발력을 직접 받아내는 부품 중 하나입니다."
            },
            { 
                id: "Bolt1", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.1557, 0.2110, 0.0669], 
                direction: [0, 0.45, -0.06], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n커넥팅 로드와 캡을 결합하는 특수 볼트입니다. 소성 변형 영역까지 조이는 각도법이 주로 사용됩니다."
            },
            { 
                id: "Bolt2", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.1557, 0.1959, -0.0076], 
                direction: [0, 0.45, -0.06], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n1번 로드의 반대쪽 볼트입니다."
            },
            { 
                id: "Bolt3", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.2708, 0.2487, 0.0070], 
                direction: [0, 0.45, 0.06], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n2번 로드 볼트입니다."
            },
            { 
                id: "Bolt4", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.2708, 0.2624, -0.0676], 
                direction: [0, 0.45, 0.06], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n2번 로드 반대쪽 볼트입니다."
            },
            { 
                id: "Bolt5", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.3838, 0.2487, 0.0070], 
                direction: [0, 0.45, 0.06], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n3번 로드 볼트입니다."
            },
            { 
                id: "Bolt6", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.3838, 0.2624, -0.0676], 
                direction: [0, 0.45, 0.06], 
                rotation: [-2.9596, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n3번 로드 반대쪽 볼트입니다."
            },
            { 
                id: "Bolt7", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.4984, 0.2110, 0.0669], 
                direction: [0, 0.45, -0.06], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n4번 로드 볼트입니다."
            },
            { 
                id: "Bolt8", 
                url: "/models/V4_Engine/커넥팅 로드 볼트.glb", 
                defaultPos: [0.4984, 0.1959, -0.0076], 
                direction: [0, 0.45, -0.06], 
                rotation: [2.9430, -1.5665, 3.1415],
                description: "재질: 고장력강 (High Tensile Steel)\n\n4번 로드 반대쪽 볼트입니다. 엔진 오버홀 시 반드시 신품으로 교체해야 하는 1회성 부품인 경우가 많습니다."
            },
            { 
                id: "CS", 
                url: "/models/V4_Engine/크랭크샤프트.glb", 
                defaultPos: [0, 0.2, 0], 
                direction: [0, 0, 0], 
                rotation: [-0.9394, 0.0000, 0.0000],
                description: "재질: 단조강 또는 주철\n\n커넥팅 로드를 통해 전달된 왕복 운동을 회전 운동으로 바꾸는 크랭크샤프트입니다. 엔진 출력을 전달하는 핵심 축입니다."
            },
            { 
                id: "PP1", 
                url: "/models/V4_Engine/피스톤 핀.glb", 
                defaultPos: [0.1963, 0.3712, -0.0042], 
                direction: [-0.5, 0, 0], 
                rotation: [0.0000, 1.5675, 0.0000],
                description: "재질: 표면 경화강 (Case Hardened Steel)\n\n피스톤과 커넥팅 로드를 연결하는 중공축 핀입니다. 가볍고 튼튼하며 마찰에 강해야 합니다."
            },
            { 
                id: "PP2", 
                url: "/models/V4_Engine/피스톤 핀.glb", 
                defaultPos: [0.3114, 0.4240, 0.0008], 
                direction: [-0.5, 0, 0], 
                rotation: [0.0000, 1.5675, 0.0000],
                description: "재질: 표면 경화강 (Case Hardened Steel)\n\n2번 피스톤 핀입니다."
            },
            { 
                id: "PP3", 
                url: "/models/V4_Engine/피스톤 핀.glb", 
                defaultPos: [0.4248, 0.4240, 0.0008], 
                direction: [0.5, 0, 0], 
                rotation: [0.0000, 1.5675, 0.0000],
                description: "재질: 표면 경화강 (Case Hardened Steel)\n\n3번 피스톤 핀입니다."
            },
            { 
                id: "PP4", 
                url: "/models/V4_Engine/피스톤 핀.glb", 
                defaultPos: [0.5398, 0.3712, -0.0042], 
                direction: [0.5, 0, 0], 
                rotation: [0.0000, 1.5675, 0.0000],
                description: "재질: 표면 경화강 (Case Hardened Steel)\n\n4번 피스톤 핀입니다."
            },
            { 
                id: "PR1", 
                url: "/models/V4_Engine/피스톤 링.glb", 
                defaultPos: [0.1557, 0.4225, -0.0042], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 특수 주철 또는 강철\n\n연소실의 압력이 새어나가지 않도록 막아주고, 실린더 벽의 오일을 긁어내리는 역할을 하는 피스톤 링입니다."
            },
            { 
                id: "PR2", 
                url: "/models/V4_Engine/피스톤 링.glb", 
                defaultPos: [0.1557, 0.4109, -0.0042], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 특수 주철 또는 강철\n\n보통 상단에는 압축 링, 하단에는 오일 링이 장착됩니다."
            },
            { 
                id: "PR3", 
                url: "/models/V4_Engine/피스톤 링.glb", 
                defaultPos: [0.1557, 0.3993, -0.0042], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 특수 주철 또는 강철\n\n실린더 벽면의 윤활유막 두께를 조절하여 엔진 소착을 방지합니다."
            },
            { 
                id: "PR4", 
                url: "/models/V4_Engine/피스톤 링.glb", 
                defaultPos: [0.2708, 0.4753, 0.0008], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 특수 주철 또는 강철\n\n2번 피스톤의 링 세트입니다."
            },
            { 
                id: "PR5", 
                url: "/models/V4_Engine/피스톤 링.glb", 
                defaultPos: [0.3838, 0.4753, 0.0008], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 특수 주철 또는 강철\n\n3번 피스톤의 링 세트입니다."
            },
            { 
                id: "PR6", 
                url: "/models/V4_Engine/피스톤 링.glb", 
                defaultPos: [0.4984, 0.4225, -0.0042], 
                direction: [0, 0.4, 0], 
                rotation: [0, 0, 0],
                description: "재질: 특수 주철 또는 강철\n\n4번 피스톤의 링 세트입니다."
            },
            { 
                id: "Piston1", 
                url: "/models/V4_Engine/피스톤.glb", 
                defaultPos: [0.1557, 0.3441, -0.0042], 
                direction: [0, 0.4, 0], 
                rotation: [-3.1416, 1.5644, -3.1416],
                description: "재질: 알루미늄 합금 (Cast Aluminum)\n\n연소실에서 폭발 압력을 직접 받아 운동 에너지로 변환하는 피스톤입니다. 고온 고압을 견뎌야 합니다."
            },
            { 
                id: "Piston2", 
                url: "/models/V4_Engine/피스톤.glb", 
                defaultPos: [0.2708, 0.3969, 0.0008], 
                direction: [0, 0.4, 0], 
                rotation: [-3.1416, 1.5644, -3.1416],
                description: "재질: 알루미늄 합금 (Cast Aluminum)\n\n2번 피스톤입니다. V4 엔진은 실린더가 V자 형태로 배치되어 컴팩트한 크기를 가집니다."
            },
            { 
                id: "Piston3", 
                url: "/models/V4_Engine/피스톤.glb", 
                defaultPos: [0.3838, 0.3969, 0.0008], 
                direction: [0, 0.4, 0], 
                rotation: [-3.1416, 1.5644, -3.1416],
                description: "재질: 알루미늄 합금 (Cast Aluminum)\n\n3번 피스톤입니다. 피스톤 상단의 형상은 연소 효율을 결정짓는 중요한 요소입니다."
            },
            { 
                id: "Piston4", 
                url: "/models/V4_Engine/피스톤.glb", 
                defaultPos: [0.4984, 0.3441, -0.0042], 
                direction: [0, 0.4, 0], 
                rotation: [-3.1416, 1.5644, -3.1416],
                description: "재질: 알루미늄 합금 (Cast Aluminum)\n\n4번 피스톤입니다."
            },
        ]
    }
};

    const currentModel = MODEL_DATA[id] || MODEL_DATA["1"];
    const assemblyParts = currentModel.parts.length > 0 ? currentModel.parts : (MODEL_DATA["1"].parts || []);

    const groupedParts = useMemo(() => {
        const groups = {};
        assemblyParts.forEach(part => {
            if (!groups[part.url]) groups[part.url] = [];
            groups[part.url].push(part);
        });
        return groups;
    }, [assemblyParts]);

    const [visibleParts, setVisibleParts] = useState(
        Object.fromEntries(assemblyParts.map(p => [p.id, true]))
    );

    const toggleGroupVisibility = (url) => {
        const partsInGroup = groupedParts[url];
        if(!partsInGroup) return;
        const isFirstVisible = visibleParts[partsInGroup[0].id];
        const newStatus = !isFirstVisible;
        const newMap = { ...visibleParts };
        partsInGroup.forEach(p => newMap[p.id] = newStatus);
        setVisibleParts(newMap);
    };

    const toggleCheckbox = (url) => {
        setCheckedGroups(prev => ({ ...prev, [url]: !prev[url] }));
    };

    const getPartName = (url) => url.split('/').pop().replace('.glb', '').replace(/_/g, ' ');

    const handleDoubleClick = (url) => {
        const targetPart = groupedParts[url]?.[0];
        if (targetPart) {
            const saved = partTransforms[targetPart.id];
            let targetPos;

            if (saved) {
                targetPos = new THREE.Vector3(...saved.position);
            } else {
                targetPos = new THREE.Vector3(
                    targetPart.defaultPos[0] + targetPart.direction[0] * explosion,
                    targetPart.defaultPos[1] + targetPart.direction[1] * explosion,
                    targetPart.defaultPos[2] + targetPart.direction[2] * explosion
                );
            }

            setFocusTarget(targetPos);
            setSelectedId(targetPart.id);
            setTimeout(() => setFocusTarget(null), 1000);
        }
    };

    const selectedPartInfo = useMemo(() =>
            assemblyParts.find(p => p.id === selectedId),
        [selectedId, assemblyParts]);

    const activeCheckedNames = useMemo(() => {
        return Object.keys(checkedGroups)
            .filter(url => checkedGroups[url])
            .map(url => getPartName(url));
    }, [checkedGroups]);

    // AI 질문 전송
    const handleAiSubmit = async (e) => {
        e.preventDefault();
        if (!aiInput.trim()) return;

        const newUserMsg = { role: 'user', text: aiInput };
        const updatedHistory = [...aiHistory, newUserMsg];
        setAiHistory(updatedHistory);
        const currentQuestion = aiInput;
        setAiInput('');

        try {
            const response = await fetch('/api/ai/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: currentQuestion,
                    currentPart: selectedPartInfo ? getPartName(selectedPartInfo.url) : "전체 모델"
                })
            });

            const data = await response.json();
            const newAiMsg = { role: 'ai', text: data.answer };
            setAiHistory([...updatedHistory, newAiMsg]);

        } catch (error) {
            console.error("AI Error:", error);
            const errorMsg = { role: 'ai', text: "서버 연결에 실패했습니다. 백엔드가 켜져 있는지 확인해주세요." };
            setAiHistory([...updatedHistory, errorMsg]);
        }
    };

    // ✅ [수정] PDF 내보내기 함수 (3D 뷰어 캡처 포함)
    const handleDownloadPdf = () => {
        // 노트 내용이 없어도 3D 이미지만이라도 저장하고 싶을 수 있으니 체크 로직을 수정하거나 유지
        if (!userNote.trim()) {
             if(!window.confirm("노트 내용이 없습니다. 3D 모델 이미지만 저장하시겠습니까?")) return;
        }

        // 1. 현재 3D 캔버스 찾아서 이미지로 변환
        const canvas = document.querySelector('canvas');
        let modelImage = '';
        
        if (canvas) {
            try {
                // toDataURL을 사용하려면 Canvas 생성 시 gl={{ preserveDrawingBuffer: true }} 설정이 필수입니다.
                modelImage = canvas.toDataURL('image/png', 1.0); 
            } catch (e) {
                console.error("캔버스 캡처 실패:", e);
            }
        }

        // 2. PDF로 변환할 HTML 구조 생성
        const element = document.createElement('div');
        
        // 날짜 포맷팅
        const date = new Date().toLocaleDateString('ko-KR', { 
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' 
        });

        element.innerHTML = `
            <div style="padding: 30px; font-family: sans-serif; color: #000; max-width: 800px; margin: 0 auto;">
                
                <div style="border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
                    <h1 style="font-size: 28px; margin: 0; color: #111;">
                        ${MODEL_DATA[id]?.name || 'Model'} - 학습 노트
                    </h1>
                    <p style="font-size: 12px; color: #666; margin-top: 5px;">${date}</p>
                </div>

                ${modelImage ? `
                    <div style="margin-bottom: 30px; text-align: center; border: 1px solid #eee; padding: 10px; border-radius: 8px;">
                        <img src="${modelImage}" style="width: 100%; max-height: 400px; object-fit: contain;" />
                        <p style="font-size: 10px; color: #888; margin-top: 5px;">Captured 3D View</p>
                    </div>
                ` : ''}

                <div style="font-size: 14px; line-height: 1.8; color: #333; white-space: pre-wrap;">${userNote || '(메모 내용 없음)'}</div>
                
                <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 10px; font-size: 10px; color: #888; text-align: right;">
                    Generated by Precision Assembly AI
                </div>
            </div>
        `;

        // 4. 옵션 설정 및 저장
        const opt = {
            margin:       10, // 여백 (mm)
            filename:     `StudyNote_${MODEL_DATA[id]?.name || 'Model'}_${Date.now()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, scrollY: 0 }, // 고해상도 렌더링
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
    };

    // ✅ 2. 선택한 텍스트를 노트로 옮기는 함수 추가
    const handleAddSelectionToNote = () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();

        if (!selectedText) {
            alert("채팅 내용 중 저장하고 싶은 부분을 드래그해서 선택해주세요!");
            return;
        }

        const newNoteContent = userNote
            ? `${userNote}\n\n${selectedText}`
            : `${selectedText}`;

        setUserNote(newNoteContent);
        setMainTab('notes'); // 노트 탭으로 이동
        selection.removeAllRanges(); // 선택 해제
    };

    return (
        <div className="h-screen bg-black flex flex-col overflow-hidden font-sans text-white">

            {/* Header */}
            <header className="flex-shrink-0 bg-[rgba(10,10,10,0.95)] backdrop-blur-xl border-b border-[rgba(255,255,255,0.08)] relative z-50">
                <div className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/browse')}
                            className="flex items-center gap-2 text-[rgba(255,255,255,0.7)] hover:text-[rgb(0,255,133)] transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                            <span className="text-sm font-medium">돌아가기</span>
                        </button>
                        <div className="h-6 w-px bg-[rgba(255,255,255,0.1)]" />
                        <div className="flex items-center gap-2">
                            <Box className="w-5 h-5 text-[rgb(0,255,133)]" />
                            <div>
                                <h4 className="text-white font-semibold">{currentModel?.name || "Model"}</h4>
                                <p className="text-xs text-[rgba(255,255,255,0.5)]">기계 공학</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleBookmark} // ✅ 수정됨: toggleBookmark 함수 연결
                            className={`px-4 py-2 bg-transparent border rounded-lg transition-colors text-sm flex items-center gap-2 ${
                                isBookmarked
                                    ? 'border-[rgb(0,255,133)] text-[rgb(0,255,133)]'
                                    : 'border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] hover:border-[rgb(0,255,133)] hover:text-[rgb(0,255,133)]'
                            }`}
                        >
                            {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                            북마크
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content Layout */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* Left Sidebar */}
                <aside
                    className={`flex-shrink-0 border-r border-[rgba(255,255,255,0.08)] bg-[rgba(5,5,5,0.8)] flex flex-col transition-all duration-300 z-40 overflow-hidden ${
                        leftPanelOpen ? 'w-72' : 'w-0'
                    }`}
                >
                    <div className="w-72 flex flex-col h-full">
                        <div className="flex-1 overflow-y-auto p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-white">부품 목록</h3>
                                <span className="text-xs text-[rgba(255,255,255,0.5)]">{Object.keys(groupedParts).length}개 그룹</span>
                            </div>

                            {/* 체크된 그룹 표시 */}
                            {activeCheckedNames.length > 0 && (
                                <div className="bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.1)] rounded-lg p-4 mb-4">
                                    <div className="text-white/60 text-xs font-bold mb-2">체크된 그룹</div>
                                    <div className="flex flex-wrap gap-2">
                                        {activeCheckedNames.map(name => (
                                            <span key={name} className="px-2 py-1 bg-white/5 rounded text-[10px] text-white/80 border border-white/10">{name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {Object.entries(groupedParts).map(([url, parts]) => {
                                    const partName = getPartName(url);
                                    const isGroupVisible = visibleParts[parts[0].id];
                                    const isChecked = !!checkedGroups[url];

                                    return (
                                        <div key={url} className="border border-[rgba(255,255,255,0.08)] rounded-lg overflow-hidden bg-[rgba(255,255,255,0.02)]">
                                            <div
                                                className={`flex items-center px-4 py-3 hover:bg-[rgba(0,255,133,0.05)] transition-colors cursor-pointer ${selectedId === parts[0].id ? 'bg-[rgba(0,255,133,0.1)]' : ''}`}
                                                onClick={() => setSelectedId(parts[0].id)}
                                                onDoubleClick={() => handleDoubleClick(url)}
                                            >
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); toggleCheckbox(url); }}
                                                    className="mr-3 flex-shrink-0 w-6 h-6"
                                                >
                                                    <div className="inline-flex items-center justify-center w-full h-full bg-black rounded-[4px] border-2 border-[rgba(0,204,130,0.20)]">
                                                        <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
                                                            {isChecked && <div className="w-[10px] h-[10px] bg-[#00CC82] rounded-[1px]" />}
                                                        </div>
                                                    </div>
                                                </button>

                                                <div className="flex-1 flex items-center justify-between text-left">
                                                    <span className={`text-sm ${selectedId === parts[0].id ? 'text-[rgba(0,255,133,0.1)] font-bold' : 'text-white'}`}>
                                                        {partName}
                                                    </span>
                                                    <button onClick={(e) => { e.stopPropagation(); toggleGroupVisibility(url); }}>
                                                        {isGroupVisible
                                                            ? <Eye className="w-4 h-4 text-[rgba(255,255,255,0.5)] hover:text-white" />
                                                            : <EyeOff className="w-4 h-4 text-[rgba(255,255,255,0.3)] hover:text-white" />
                                                        }
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex-shrink-0 p-5 border-t border-[rgba(255,255,255,0.08)] flex gap-2">
                            <button
                                onClick={() => navigate('/browse')}
                                className="flex-1 px-4 py-2 bg-[rgba(0,255,133,0.1)] border border-[rgba(0,255,133,0.3)] text-[rgb(0,255,133)] rounded-lg hover:bg-[rgba(0,255,133,0.15)] transition-colors text-sm whitespace-nowrap"
                            >
                                모델 라이브러리
                            </button>
                        </div>
                    </div>
                </aside>

                {/* Center (3D Viewer) */}
                <main className="flex-1 flex flex-col relative min-w-0" style={{
                    background: 'radial-gradient(ellipse at 20% 50%, rgba(0,255,133,0.08) 0%, rgba(0,0,0,0) 50%), radial-gradient(ellipse at 80% 50%, rgba(0,100,255,0.06) 0%, rgba(0,0,0,0) 50%), black'
                }}>

                    <div className="flex-1 relative">
                        <Canvas
                            shadows
                            camera={{ position: [0.8, 0.8, 0.8], fov: 35 }}
                            className="bg-transparent"
                            gl={{ preserveDrawingBuffer: true }}
                            onPointerMissed={(e) => {
                                if (e.type === 'click') setSelectedId(null);
                            }}
                        >
                            <Suspense fallback={null}>
                                <CameraPersister
                                    modelId={id || 'default'}
                                    shouldReset={shouldResetCamera}
                                    onResetComplete={() => setShouldResetCamera(false)}
                                />
                                <CameraRig targetPosition={focusTarget} />
                                <ambientLight intensity={0.5} />
                                <spotLight position={[10, 10, 10]} intensity={1.5} castShadow />
                                <group>
                                    {assemblyParts.map((part) => (
                                        <DraggablePart
                                            key={part.id}
                                            part={part}
                                            explosion={explosion}
                                            isSelected={selectedId === part.id}
                                            onSelect={setSelectedId}
                                            transformMode={transformMode}
                                            onPartClick={(id) => setSelectedId(id)}
                                            isVisible={visibleParts[part.id]}
                                            savedTransform={partTransforms[part.id]}
                                            onTransformChange={handlePartTransformChange}
                                        />
                                    ))}
                                </group>
                                <ContactShadows opacity={0.5} scale={10} blur={2} far={4} color="#00ff85" />
                                <Environment preset="city" />
                            </Suspense>
                            <OrbitControls makeDefault minDistance={0.1} maxDistance={3} />
                        </Canvas>
                    </div>

                    {/* 하단 패널 */}
                    <div className="flex-shrink-0 py-6 border-t border-[rgba(255,255,255,0.08)] bg-[rgba(5,5,5,0.8)] z-50 flex flex-col gap-4">
                        <div className="flex items-center gap-4 px-6">
                            <span className="text-xs font-medium text-[rgba(255,255,255,0.7)] whitespace-nowrap min-w-[60px]">
                                폭발도
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="0.5"
                                step="0.0001"
                                value={explosion}
                                onChange={(e) => {
                                    const newValue = parseFloat(e.target.value);
                                    setExplosion(newValue);
                                    if (Object.keys(partTransforms).length > 0) {
                                        setPartTransforms({});
                                    }
                                }}
                                className="flex-1 h-1 bg-[rgba(255,255,255,0.1)] rounded-lg appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, rgb(0,120,255) 0%, rgb(0,120,255) ${(explosion/0.5)*100}%, rgba(255,255,255,0.1) ${(explosion/0.5)*100}%, rgba(255,255,255,0.1) 100%)`
                                }}
                            />
                            <span className="text-xs font-mono text-[rgb(0,255,133)] min-w-[40px] text-right">
                                {Math.round((explosion/0.5)*100)}%
                            </span>
                        </div>

                        <div className="relative flex items-center justify-center w-full h-9">
                            <button
                                onClick={() => setLeftPanelOpen(!leftPanelOpen)}
                                className="absolute top-1/2 -translate-y-1/2 z-50 w-10 h-14 bg-[rgba(0,255,133,0.1)] border border-[rgba(0,255,133,0.3)] text-[rgb(0,255,133)] rounded-r-lg hover:bg-[rgba(0,255,133,0.15)] flex items-center justify-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,255,133,0.4)]"
                                style={{ left: leftPanelOpen ? '0px' : '0px' }}
                            >
                                {leftPanelOpen ? <ChevronLeft className="w-5 h-5 text-white" /> : <ChevronRight className="w-5 h-5 text-white" />}
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleReset}
                                    className="h-9 w-10 flex items-center justify-center bg-[#1a1a1a] border border-[rgba(255,255,255,0.15)] rounded text-white/70 hover:text-white hover:border-[rgb(255,100,100)] hover:bg-[rgba(255,100,100,0.1)] transition-colors"
                                    title="초기화 (메모 포함)"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={handleAiToggle}
                                    className={`h-9 px-4 flex items-center gap-2 bg-[#1a1a1a] border rounded text-xs transition-all ${
                                        isRightPanelOpen
                                            ? 'border-[rgb(0,255,133)] text-[rgb(0,255,133)] bg-[rgba(0,255,133,0.1)]'
                                            : 'border-[rgba(255,255,255,0.15)] text-white/70 hover:text-white hover:border-[rgb(0,255,133)]'
                                    }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>AI Assistant</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </main>

                <div
                    className="w-[2px] hover:w-1 bg-[rgba(255,255,255,0.1)] hover:bg-[rgb(0,255,133)] cursor-col-resize transition-all z-50 flex-shrink-0"
                    onMouseDown={startResizing}
                />

                {/* Right Sidebar */}
                <aside
                    className={`flex-shrink-0 border-l border-[rgba(255,255,255,0.08)] bg-[rgba(5,5,5,0.8)] flex flex-col z-40 overflow-hidden ${
                        isResizing ? 'transition-none' : 'transition-all duration-300'
                    }`}
                    style={{ width: isRightPanelOpen ? rightPanelWidth : 0 }}
                >
                    <div className="flex flex-col h-full w-full">
                        {/* 탭 헤더 */}
                        <div className="flex-shrink-0 px-5 pt-5 pb-3 border-b border-[rgba(255,255,255,0.08)]">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setMainTab('ai')}
                                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                        mainTab === 'ai'
                                            ? 'bg-transparent border-b-2 border-[rgb(0,255,133)] text-[rgb(0,255,133)]'
                                            : 'bg-transparent text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)]'
                                    }`}
                                >
                                    <MessageSquare className="w-4 h-4" /> AI 어시스턴트
                                </button>
                                <button
                                    onClick={() => setMainTab('notes')}
                                    className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                                        mainTab === 'notes'
                                            ? 'bg-transparent border-b-2 border-[rgb(0,255,133)] text-[rgb(0,255,133)]'
                                            : 'bg-transparent text-[rgba(255,255,255,0.6)] hover:text-[rgba(255,255,255,0.9)]'

                                    }`}
                                >
                                    <FileText className="w-4 h-4" /> 학습 노트
                                </button>
                            </div>
                        </div>

                        {/* AI 탭 컨텐츠 */}
                        {mainTab === 'ai' && (
                            <>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                     {/* ✅ 선택된 부품 상세 정보 표시 */}
                                    {selectedPartInfo ? (
                                        <div className="mb-4">
                                            {/* 부품명 박스 (사진 속 PART3 스타일) */}
                                            <div className="flex items-center gap-2 px-4 py-3 rounded-lg border border-[rgb(0,255,133)] bg-[rgba(0,255,133,0.05)] mb-3 shadow-[0_0_15px_rgba(0,255,133,0.1)]">
                                                <Info className="w-4 h-4 text-[rgb(0,255,133)]" />
                                                <span className="text-[rgb(0,255,133)] font-bold text-sm tracking-wide uppercase">
                                                    {getPartName(selectedPartInfo.url)}
                                                </span>
                                            </div>
                                            
                                            {/* 설명 텍스트 */}
                                            <div className="px-1">
                                                <p className="text-sm text-[rgba(255,255,255,0.8)] leading-relaxed whitespace-pre-wrap">
                                                    {selectedPartInfo.description || "이 부품에 대한 상세 설명이 데이터셋에 없습니다."}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        /* 부품 미선택 시 안내 */
                                        <div className="mb-4 p-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-xl text-center">
                                            <p className="text-xs text-white/50">
                                                3D 뷰어에서 부품을 클릭하면<br/>상세 설명이 이곳에 표시됩니다.
                                            </p>
                                        </div>
                                    )}
                                                
                                    {/* ✅ [수정] 대화 기록이 없을 때 'AI 기능 소개 메뉴' 표시 */}
                                    {aiHistory.length === 0 ? (
                                        <div className="flex flex-col gap-3 mt-4">
                                            <div className="text-center mb-2">
                                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgb(0,255,133)]/10 mb-3">
                                                    <Bot className="w-6 h-6 text-[rgb(0,255,133)]" />
                                                </div>
                                                <h3 className="text-white font-bold text-lg">AI 어시스턴트</h3>
                                                <p className="text-white/50 text-xs mt-1">무엇을 도와드릴까요?</p>
                                            </div>
                                    
                                            {/* 기능 1: 부품 설명 */}
                                            <button 
                                                onClick={() => setAiInput("이 모델의 주요 부품들에 대해 설명해줘.")}
                                                className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgb(0,255,133)]/50 transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                                    <BookOpen className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white group-hover:text-[rgb(0,255,133)] transition-colors">부품 설명 듣기</div>
                                                    <p className="text-xs text-white/40 mt-0.5">각 부품의 역할과 특징을 알려드려요.</p>
                                                </div>
                                            </button>
                                    
                                            {/* 기능 2: 구조 분석 */}
                                            <button 
                                                onClick={() => setAiInput("이 모델의 조립 구조와 작동 원리를 알려줘.")}
                                                className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgb(0,255,133)]/50 transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                                    <BrainCircuit className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white group-hover:text-[rgb(0,255,133)] transition-colors">구조 및 원리 분석</div>
                                                    <p className="text-xs text-white/40 mt-0.5">어떻게 조립되고 작동하는지 이해해요.</p>
                                                </div>
                                            </button>
                                    
                                            {/* 기능 3: 퀴즈 생성 */}
                                            <button 
                                                onClick={() => setAiInput("이 모델에 관련된 퀴즈를 3개 내줘.")}
                                                className="flex items-center gap-4 p-4 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.05)] hover:border-[rgb(0,255,133)]/50 transition-all text-left group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400 group-hover:scale-110 transition-transform">
                                                    <Sparkles className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-white group-hover:text-[rgb(0,255,133)] transition-colors">지식 테스트 퀴즈</div>
                                                    <p className="text-xs text-white/40 mt-0.5">학습한 내용을 퀴즈로 확인해보세요.</p>
                                                </div>
                                            </button>
                                        </div>
                                    ) : (
                                        /* 대화 기록이 있을 때는 기존 채팅 표시 */
                                        aiHistory.map((msg, idx) => (
                                            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'ai' ? 'bg-[rgb(0,255,133)]/20 text-[rgb(0,255,133)]' : 'bg-white/10'}`}>
                                                    {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                </div>
                                                <div className={`p-3 rounded-lg text-sm max-w-[80%] leading-relaxed ${
                                                    msg.role === 'ai'
                                                        ? 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white/90'
                                                        : 'bg-[rgb(0,255,133)]/10 border border-[rgb(0,255,133)]/30 text-white'
                                                }`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <form onSubmit={handleAiSubmit} className="flex-shrink-0 p-5 border-t border-[rgba(255,255,255,0.08)] flex flex-col gap-2">
                                    {/* ✅ 3. 버튼 UI 추가 (이곳에만 추가됨) */}
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={handleAddSelectionToNote}
                                            className="text-xs text-[rgb(0,255,133)] hover:text-white flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-[rgba(0,255,133,0.1)]"
                                            title="드래그한 텍스트를 노트에 추가"
                                        >
                                            <PenTool className="w-3 h-3" />
                                            <span>선택 내용 노트에 저장</span>
                                        </button>
                                    </div>

                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={aiInput}
                                            onChange={(e) => setAiInput(e.target.value)}
                                            placeholder="질문하세요..."
                                            className="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm placeholder:text-[rgba(255,255,255,0.4)] focus:outline-none focus:border-[rgb(0,255,133)] transition-colors"
                                        />
                                        <button type="submit" className="w-10 h-10 flex items-center justify-center bg-[rgb(0,255,133)] text-black rounded-lg hover:bg-[rgb(0,230,120)] transition-colors flex-shrink-0">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}

                        {mainTab === 'notes' && (
                            <>
                                <div className="flex-shrink-0 p-5 border-b border-[rgba(255,255,255,0.08)]">
                                    <div className="flex items-center justify-between">

                                        {/* 왼쪽: 제목 + 자동 저장 상태 표시 */}
                                        <div className="flex items-center gap-3">
                                            <h4 className="text-sm font-semibold text-white">나의 학습 노트</h4>
                                            <div className="text-xs text-white/40 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3 text-[rgb(0,255,133)]" />
                                                <span>자동 저장됨</span>
                                            </div>

                                            {/* 오른쪽: PDF 내보내기 버튼 */}
                                            <button 
                                                onClick={handleDownloadPdf} // 나중에 PDF 함수 연결 필요
                                                className="px-3 py-1.5 bg-transparent border border-[rgba(255,255,255,0.1)] text-[rgba(255,255,255,0.7)] rounded-lg hover:border-[rgb(0,255,133)] hover:text-[rgb(0,255,133)] transition-colors text-xs flex items-center gap-2"
                                            >
                                                <Download className="w-3 h-3" /> 
                                                PDF로 저장하기
                                            </button>

                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 p-5">
                                    <textarea
                                        value={userNote}
                                        onChange={(e) => setUserNote(e.target.value)}
                                        placeholder="학습 내용을 메모하세요... (입력 즉시 자동 저장됩니다)"
                                        className="w-full h-full p-4 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.1)] rounded-lg text-white text-sm placeholder:text-[rgba(255,255,255,0.4)] resize-none focus:outline-none focus:border-[rgb(0,255,133)] transition-colors leading-relaxed"
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}