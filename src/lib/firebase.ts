import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import {
  AppSettings,
  OXQuiz,
  GoldenBellQuestion,
} from '../types';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Default Tree Levels
export const DEFAULT_TREE_LEVELS = [
  {
    level: 1,
    name: '새싹 지킴이',
    minPoints: 0,
    description: '개인정보보호의 첫걸음을 뗀 귀여운 새싹',
    badge: '🌱',
    color: '#10B981',
  },
  {
    level: 2,
    name: '성장 묘목',
    minPoints: 50,
    description: '기본적인 보안 수칙을 성실히 실천하는 어린 나무',
    badge: '🌿',
    color: '#059669',
  },
  {
    level: 3,
    name: '푸른 보호목',
    minPoints: 120,
    description: '풍성한 잎으로 안전을 지키는 든든한 나무',
    badge: '🌲',
    color: '#047857',
  },
  {
    level: 4,
    name: '보안 거목',
    minPoints: 220,
    description: '자물쇠 열매가 열리고 깊은 신뢰를 주는 거목',
    badge: '🌳',
    color: '#0D9488',
  },
  {
    level: 5,
    name: '신성한 수호목',
    minPoints: 350,
    description: '빛나는 황금 방패로 완벽한 정보보호를 이루어낸 수호목',
    badge: '👑',
    color: '#EAB308',
  },
];

export const DEFAULT_GOLDEN_BELL_SCHEDULE = [
  { round: 1, startTime: '10:00', endTime: '10:30' },
  { round: 2, startTime: '11:00', endTime: '11:30' },
  { round: 3, startTime: '13:00', endTime: '13:30' },
  { round: 4, startTime: '14:00', endTime: '14:30' },
  { round: 5, startTime: '15:00', endTime: '15:30' },
];

export const DEFAULT_PRESET_PLEDGES = [
  '자리 비울 때는 항상 Win + L 화면 잠금을 실천하겠습니다.',
  '출처가 불분명한 이메일 링크와 첨부파일은 절대 열지 않겠습니다.',
  '퇴근 시 책상 위 개인정보 서류를 파쇄하거나 안전하게 보관하겠습니다.',
  '업무 시스템 비밀번호는 영문·숫자·특수문자 조합으로 안전하게 관리하겠습니다.',
  '인가되지 않은 개인 USB 및 외부 저장장치를 업무 PC에 연결하지 않겠습니다.',
  '업무에 꼭 필요한 최소한의 개인정보만 안전하게 수집하고 처리하겠습니다.',
  '의심스러운 개인정보 침해 징후 발견 시 즉시 보안담당자에게 알리겠습니다.',
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  treeLevels: DEFAULT_TREE_LEVELS,
  goldenBellSchedule: DEFAULT_GOLDEN_BELL_SCHEDULE,
  goldenBellRewards: {
    first: 50,
    second: 50,
    third: 50,
  },
  adminPassword: 'admin',
  oxRewardDrops: 1,
  wateringRewardPoints: 10,
  pledgeRewardPoints: 30,
  activeRound: null,
  roundStatus: 'idle',
  roundStartTime: null,
  presetPledges: DEFAULT_PRESET_PLEDGES,
};

export const INITIAL_OX_QUIZZES: OXQuiz[] = [
  {
    id: 'ox_1',
    question: '자리 비움 시 화면잠금(Win + L)은 개인정보 유출 방지의 필수 수칙이다.',
    answer: true,
    explanation: '자리를 비울 때 화면을 잠그지 않으면 타인이 사내 중요 정보나 개인정보를 열람할 수 있습니다.',
    category: 'PC보안',
  },
  {
    id: 'ox_2',
    question: '사내 PC에서 인가되지 않은 개인 USB 메모리를 자유롭게 연결하여 사용해도 된다.',
    answer: false,
    explanation: '미인가 저장매체는 악성코드 감염 및 내부 정보 유출의 주요 경로이므로 반드시 등록된 보안 매체만 사용해야 합니다.',
    category: '매체보안',
  },
  {
    id: 'ox_3',
    question: '업무용 패스워드는 영문, 숫자, 특수문자를 혼합하여 8자리 이상으로 설정해야 한다.',
    answer: true,
    explanation: '복합적인 문자 조합과 정기적인 패스워드 변경은 무작위 대입 공격을 차단하는 기본 원칙입니다.',
    category: '계정보안',
  },
  {
    id: 'ox_4',
    question: '출처가 불분명한 이메일의 첨부파일이나 링크(URL)는 호기심에 한 번쯤 열어봐도 안전하다.',
    answer: false,
    explanation: '스피어 피싱 및 랜섬웨어 감염의 시작점이 되므로 의심스러운 메일은 열람하지 말고 즉시 신고해야 합니다.',
    category: '메일보안',
  },
  {
    id: 'ox_5',
    question: '개인정보가 포함된 인쇄물은 퇴근 시 책상 위에 두지 않고 파쇄하거나 시건장치에 보관해야 한다.',
    answer: true,
    explanation: '클린데스크(Clean Desk) 정책에 따라 출력물 방치로 인한 개인정보 노출을 원천 방지해야 합니다.',
    category: '문서보안',
  },
  {
    id: 'ox_6',
    question: '고객의 주민등록번호는 법적 근거가 없더라도 동의만 받으면 수집·저장할 수 있다.',
    answer: false,
    explanation: '주민등록번호는 개인정보보호법에 따라 법령에서 구체적으로 허용한 경우에만 예외적으로 처리할 수 있습니다.',
    category: '법령준수',
  },
  {
    id: 'ox_7',
    question: '보유 기간이 경과하거나 처리 목적이 달성된 개인정보는 백업용으로 영구 보관해도 무방하다.',
    answer: false,
    explanation: '목적 달성 또는 보유기간 경과 시 지체 없이(5일 이내) 복구 불가능한 방법으로 파기해야 합니다.',
    category: '정보파기',
  },
  {
    id: 'ox_8',
    question: 'PC 운영체제(OS)와 백신 소프트웨어는 자동 업데이트를 활성화하여 최신 상태를 유지해야 한다.',
    answer: true,
    explanation: '최신 보안 패치는 알려진 취약점을 통한 해킹 공격을 효과적으로 방어합니다.',
    category: '시스템보안',
  },
  {
    id: 'ox_9',
    question: '공공장소의 무료 공개 Wi-Fi에서는 사내 인트라넷이나 업무 시스템에 직접 접속하지 않는 것이 좋다.',
    answer: true,
    explanation: '공개 와이파이는 데이터 패킷 감청(스니핑) 위험이 있으므로 전용 VPN이나 모바일 핫스팟을 이용해야 합니다.',
    category: '네트워크',
  },
  {
    id: 'ox_10',
    question: '개인정보 침해 사고가 의심되거나 발생했을 때는 개인적으로 해결하기보다 즉시 보안부서에 알려야 한다.',
    answer: true,
    explanation: '초기 신속한 신고와 대응 조치가 2차 피해 확산을 막는 가장 중요한 열쇠입니다.',
    category: '사고대응',
  },
];

export const INITIAL_GOLDEN_BELL_QUESTIONS: GoldenBellQuestion[] = [
  // Round 1 (10:00)
  {
    id: 'gb_r1_q1',
    roundIndex: 0,
    questionNumber: 1,
    question: '다음 중 개인정보보호법상 "개인정보"에 해당하지 않는 것은?',
    options: ['주민등록번호', '성명 및 생년월일', '스마트폰 번호', '법인 사업자등록번호 (대표자 정보 제외)'],
    answerIndex: 3,
    explanation: '법인명, 사업자번호 등 순수 법인 정보는 살아있는 개인에 관한 정보가 아니므로 개인정보에 해당하지 않습니다.',
    hint: '자연인이 아닌 법인 관련 정보',
  },
  {
    id: 'gb_r1_q2',
    roundIndex: 0,
    questionNumber: 2,
    question: '잠시 자리를 비울 때 PC 화면을 즉시 잠그는 윈도우 단축키는?',
    options: ['Ctrl + Alt + Del', 'Windows 키 + L', 'Windows 키 + D', 'Alt + F4'],
    answerIndex: 1,
    explanation: 'Windows + L (Lock) 단축키를 누르면 1초 만에 화면이 안전하게 잠깁니다.',
  },
  {
    id: 'gb_r1_q3',
    roundIndex: 0,
    questionNumber: 3,
    question: '다음 중 가장 안전한 패스워드 관리 수칙은 무엇일까요?',
    options: ['외우기 쉽게 12345678 사용', '모니터 모서리에 포스트잇으로 부착', '여러 사이트에서 동일한 비밀번호 재사용', '영문 대소문자/숫자/특수문자 조합 10자리 이상 설정'],
    answerIndex: 3,
    explanation: '복합 조합으로 10자리 이상 설정하고 주기적으로 변경하는 것이 가장 안전합니다.',
  },
  {
    id: 'gb_r1_q4',
    roundIndex: 0,
    questionNumber: 4,
    question: '개인정보가 담긴 서류를 파기할 때 올바른 방법은?',
    options: ['세단기로 분쇄하거나 전문 파쇄업체 위탁', '이면지로 재활용하여 메모지로 사용', '일반 쓰레기통에 구겨서 버리기', '서랍 깊숙이 무기한 보관하기'],
    answerIndex: 0,
    explanation: '개인정보는 복원이 불가능하도록 완전 파쇄하거나 소각해야 합니다.',
  },
  {
    id: 'gb_r1_q5',
    roundIndex: 0,
    questionNumber: 5,
    question: '개인정보 수집 목적이 달성된 경우 원칙적으로 며칠 이내에 파기해야 할까요?',
    options: ['5일 이내', '10일 이내', '1개월 이내', '1년 이내'],
    answerIndex: 0,
    explanation: '개인정보보호법 시행령에 따라 보유기간 경과나 목적 달성 시 5일 이내에 파기해야 합니다.',
  },
  // Round 2 (11:00)
  {
    id: 'gb_r2_q1',
    roundIndex: 1,
    questionNumber: 1,
    question: '출처가 불분명한 문자메시지 내 인터넷 링크(URL)를 클릭하도록 유도하는 사기 수법은?',
    options: ['스미싱 (Smishing)', '파밍 (Pharming)', '디도스 (DDoS)', '랜섬웨어 (Ransomware)'],
    answerIndex: 0,
    explanation: 'SMS(문자메시지)와 피싱(Phishing)의 합성어로 스미싱이라고 부릅니다.',
  },
  {
    id: 'gb_r2_q2',
    roundIndex: 1,
    questionNumber: 2,
    question: '다음 중 법령의 구체적 근거 없이 원칙적으로 처리가 금지되는 고유식별정보는?',
    options: ['이메일 주소', '휴대전화번호', '주민등록번호', '직급 및 사원번호'],
    answerIndex: 2,
    explanation: '주민등록번호는 법률·대통령령 등의 명시적 근거 없이는 수집·처리가 엄격히 금지됩니다.',
  },
  {
    id: 'gb_r2_q3',
    roundIndex: 1,
    questionNumber: 3,
    question: '업무 종료 후 책상 위 서류와 PC를 정리하여 유출을 방지하는 보안 정책은?',
    options: ['클린룸 정책', '클린데스크 (Clean Desk) 정책', '그린오피스 정책', '제로트러스트 정책'],
    answerIndex: 1,
    explanation: '클린데스크 정책은 서류 방치로 인한 물리적 유출을 차단하는 기본 활동입니다.',
  },
  {
    id: 'gb_r2_q4',
    roundIndex: 1,
    questionNumber: 4,
    question: '사용자의 파일을 암호화하여 인질로 잡고 금전을 요구하는 악성 프로그램은?',
    options: ['랜섬웨어 (Ransomware)', '스파이웨어 (Spyware)', '웜 (Worm)', '트로이목마 (Trojan)'],
    answerIndex: 0,
    explanation: 'Ransom(몸값)과 Software의 합성어로 파일을 암호화하고 금전을 요구합니다.',
  },
  {
    id: 'gb_r2_q5',
    roundIndex: 1,
    questionNumber: 5,
    question: '카페 등 공공장소에서 업무 시 화면을 옆에서 엿보는 행위를 방지하는 도구는?',
    options: ['정보보호 보안필름 (프라이버시 필름)', '화면 확대경', '블루라이트 차단안경', '웹캠 커버'],
    answerIndex: 0,
    explanation: '시야각을 좁혀 측면 엿보기를 방지하는 프라이버시 필터가 필수적입니다.',
  },
  // Round 3 (13:00)
  {
    id: 'gb_r3_q1',
    roundIndex: 2,
    questionNumber: 1,
    question: '로그인 시 아이디/비밀번호 외에 OTP나 모바일 인증을 추가로 거치는 방식은?',
    options: ['단일 인증', '2차 다중인증 (2FA / MFA)', '익명 인증', '단방향 암호화'],
    answerIndex: 1,
    explanation: '2단계 다중인증(MFA)을 적용하면 계정 탈취 위험을 99% 이상 감소시킬 수 있습니다.',
  },
  {
    id: 'gb_r3_q2',
    roundIndex: 2,
    questionNumber: 2,
    question: '다음 중 사내 정보를 외부로 유출할 위험이 가장 높은 행위는?',
    options: ['사내 지정 결재라인 준수', '개인 클라우드/웹메일로 사내 업무 파일 전송', '중요 문서 암호화 저장', '보안 승인된 USB 사용'],
    answerIndex: 1,
    explanation: '미인가 사설 클라우드나 개인 웹메일 전송은 정보 유출로 직결되는 중대 위반 행위입니다.',
  },
  {
    id: 'gb_r3_q3',
    roundIndex: 2,
    questionNumber: 3,
    question: '개인정보 유출 사고가 발생했을 때 기업이 정보주체에게 통지해야 하는 법정 시한은?',
    options: ['72시간 이내', '24시간 이내', '10일 이내', '30일 이내'],
    answerIndex: 0,
    explanation: '개인정보보호법에 따라 정당한 사유가 없는 한 72시간 이내에 정보주체에게 통지해야 합니다.',
  },
  {
    id: 'gb_r3_q4',
    roundIndex: 2,
    questionNumber: 4,
    question: '특정 대상(기업, 담당자)을 정밀 타겟팅하여 발송하는 정교한 악성 이메일 공격은?',
    options: ['스피어 피싱 (Spear Phishing)', '스팸 메일', '매크로 공격', '서비스 거부 공격'],
    answerIndex: 0,
    explanation: '작살(Spear)로 찌르듯 특정 조직의 내부자를 노려 신뢰할 만한 위장 메일을 보내는 공격입니다.',
  },
  {
    id: 'gb_r3_q5',
    roundIndex: 2,
    questionNumber: 5,
    question: '출장이나 외근 시 공공 Wi-Fi 이용 시 사내망 접속을 위해 반드시 사용해야 하는 것은?',
    options: ['가상사설망 (VPN)', '토렌트 프로그램', '프록시 서버 해제', '자동 로그인'],
    answerIndex: 0,
    explanation: 'VPN(Virtual Private Network)은 공공 인터넷망에서도 통신을 암호화하여 안전하게 사내망에 접속하도록 합니다.',
  },
  // Round 4 (14:00)
  {
    id: 'gb_r4_q1',
    roundIndex: 3,
    questionNumber: 1,
    question: '사내에서 습득한 정체불명의 USB 메모리를 발견했을 때 올바른 대처법은?',
    options: ['내 PC에 꽂아서 내용 확인', '정보보호 담당자 또는 보안팀에 인계', '포맷 후 개인용으로 사용', '동료 PC에 꽂아보기'],
    answerIndex: 1,
    explanation: '악성코드가 심어진 USB를 PC에 꽂는 순간 사내 전체가 감염될 수 있으므로 즉시 보안팀에 전달해야 합니다.',
  },
  {
    id: 'gb_r4_q2',
    roundIndex: 3,
    questionNumber: 2,
    question: '다음 중 개인정보를 취급할 때 기본 원칙으로 가장 적절한 것은?',
    options: ['필요한 최소한의 개인정보만 수집·이용', '언젠가 쓸지 모르니 최대한 많이 수집', '동의서 글씨는 작게 눈에 안 띄게', '동의 없이 마케팅 목적 활용'],
    answerIndex: 0,
    explanation: '개인정보보호법 제3조 제1항의 "최소 수집의 원칙"에 따라 필수적인 최소한의 정보만 처리해야 합니다.',
  },
  {
    id: 'gb_r4_q3',
    roundIndex: 3,
    questionNumber: 3,
    question: '개인정보 처리자가 안전성 확보를 위해 취해야 할 기술적 보호조치에 해당하지 않는 것은?',
    options: ['개인정보 암호화 저장 및 전송', '접근 권한의 차등 부여 및 관리', '접속 기록의 보관 및 위변조 방지', '동료 간 업무 편의를 위한 패스워드 공유'],
    answerIndex: 3,
    explanation: '계정 및 비밀번호 공유는 책임 소재를 불분명하게 하고 보안을 무력화하므로 절대 금지됩니다.',
  },
  {
    id: 'gb_r4_q4',
    roundIndex: 3,
    questionNumber: 4,
    question: '사람의 심리적 취약점을 이용해 보안 정보를 캐내는 공격 기법(예: 전화 위장)은?',
    options: ['사회공학적 기법 (Social Engineering)', '버퍼 오버플로우', 'SQL 인젝션', '포트 스캐닝'],
    answerIndex: 0,
    explanation: 'IT 기술보다는 신뢰, 공포, 호기심 등 인간의 심리를 교묘히 파고드는 공격을 사회공학적 공격이라 합니다.',
  },
  {
    id: 'gb_r4_q5',
    roundIndex: 3,
    questionNumber: 5,
    question: '개인정보가 포함된 엑셀 파일을 다른 부서나 외부에 전달할 때 반드시 해야 할 조치는?',
    options: ['파일 암호 설정 및 암호는 별도 채널로 전달', '확장자를 변경해서 전송', '일반 텍스트 파일로 변환', '이름을 무작위로 변경하여 전송'],
    answerIndex: 0,
    explanation: '파일 자체에 강력한 비밀번호를 걸어 암호화하고, 비밀번호는 전화나 메신저 등 다른 경로로 전달해야 합니다.',
  },
  // Round 5 (15:00)
  {
    id: 'gb_r5_q1',
    roundIndex: 4,
    questionNumber: 1,
    question: '다음 중 스마트폰 및 모바일 기기의 보안 수칙으로 옳지 않은 것은?',
    options: ['출처를 알 수 없는 APK 파일 직접 설치', '기기 잠금 화면 (PIN, 생체인증) 필수 설정', 'OS 및 설치 앱을 최신 버전으로 업데이트', '분실 시를 대비한 원격 잠금/삭제 기능 활성화'],
    answerIndex: 0,
    explanation: '공식 스토어가 아닌 비공식 경로로 APK를 설치하면 악성 스파이앱에 감염되어 개인정보가 유출됩니다.',
  },
  {
    id: 'gb_r5_q2',
    roundIndex: 4,
    questionNumber: 4,
    question: '사내 PC를 장기간 사용하지 않거나 퇴근할 때 가장 바람직한 조치는?',
    options: ['PC 전원 종료 (Shut Down)', '모니터만 끄기', '화면보호기 실행 상태로 두기', '그대로 켜두기'],
    answerIndex: 0,
    explanation: '퇴근 시에는 PC 전원을 완전히 종료하여 야간 원격 침입 및 전력 낭비를 방지해야 합니다.',
  },
  {
    id: 'gb_r5_q3',
    roundIndex: 4,
    questionNumber: 3,
    question: '회사 임직원을 사칭하여 "급한 송금"이나 "인증번호 전달"을 요구하는 메신저 공격은?',
    options: ['메신저 피싱', 'DDOS 공격', '워터링홀 공격', '제로데이 공격'],
    answerIndex: 0,
    explanation: '프로필 사진이나 이름을 도용해 가족이나 동료를 사칭하는 메신저 피싱에 주의해야 합니다.',
  },
  {
    id: 'gb_r5_q4',
    roundIndex: 4,
    questionNumber: 4,
    question: '개인정보 침해 사고가 의심될 때 개인이 즉시 해야 할 초기 조치로 올바른 것은?',
    options: ['PC 네트워크 랜선 분리 후 보안담당자에게 즉시 유선 보고', 'PC를 포맷하여 증거 삭제', '친구들에게 SNS로 공유', '아무 일 없었던 것처럼 덮어두기'],
    answerIndex: 0,
    explanation: '네트워크 연결을 끊어 악성코드의 추가 확산과 자료 유출을 막고 신속히 보안팀에 신고해야 합니다.',
  },
  {
    id: 'gb_r5_q5',
    roundIndex: 4,
    questionNumber: 5,
    question: '개인정보보호의 날은 법정기념일로 언제일까요?',
    options: ['9월 30일', '5월 1일', '11월 11일', '1월 1일'],
    answerIndex: 0,
    explanation: '개인정보보호법이 제정·시행된 날을 기념하여 매년 9월 30일이 "개인정보보호의 날"로 지정되어 있습니다.',
  },
];

// Initialize Firestore collections with defaults if empty
export async function initializeFirestoreDefaults(): Promise<AppSettings> {
  try {
    // 1. Settings
    const settingsRef = doc(db, 'app_settings', 'config');
    const settingsSnap = await getDoc(settingsRef);
    let currentSettings = DEFAULT_APP_SETTINGS;
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, DEFAULT_APP_SETTINGS);
    } else {
      currentSettings = { ...DEFAULT_APP_SETTINGS, ...settingsSnap.data() } as AppSettings;
    }

    // 2. OX Quizzes
    const oxSnap = await getDocs(collection(db, 'ox_quizzes'));
    if (oxSnap.empty) {
      for (const q of INITIAL_OX_QUIZZES) {
        await setDoc(doc(db, 'ox_quizzes', q.id), q);
      }
    }

    // 3. Golden Bell Questions
    const gbSnap = await getDocs(collection(db, 'golden_bell_questions'));
    if (gbSnap.empty) {
      for (const q of INITIAL_GOLDEN_BELL_QUESTIONS) {
        await setDoc(doc(db, 'golden_bell_questions', q.id), q);
      }
    }

    return currentSettings;
  } catch (err) {
    console.warn('Firestore initialization fallback to memory defaults:', err);
    return DEFAULT_APP_SETTINGS;
  }
}
