# 🌐 LingoTutor: AI Personal Language Tutor

<p align="center">
  <img src="https://img.shields.io/badge/Gemini_1.5_Flash-8E75C2?style=for-the-badge&logo=googlegemini&logoColor=white" alt="Gemini" />
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License" />
</p>

> **LingoTutor**는 Google Gemini 1.5 Flash API를 활용하여 사용자가 일기 형식으로 작성한 글을 기반으로 말을 이어나가고, 실시간 첨삭 및 모르는 단어를 자동 정리해주는 나만의 **개인 맞춤형 로컬 AI 언어 튜터**입니다. 
> 
> 별도의 유료 서비스나 데이터 유출 걱정 없이 로컬 환경에서 간편하고 안전하게 구동됩니다.

---

## ✨ 핵심 기능 (Key Features)

### 1. 🇺🇸/🇯🇵 영어 & 일본어 듀얼 학습 모드
* 영어와 일본어 세션이 완전히 분리되어 각각 독립적으로 동작합니다.
* 사용자의 대화 히스토리 및 단어 학습 데이터는 로컬 저장소에 완벽히 분리 보관됩니다.

### ✍️ 2. 자연스러운 대화 & 실시간 문법 교정
* 오늘 있었던 일이나 생각을 자유롭게 적으면 AI가 흥미로운 Follow-up 질문을 던져 대화를 자연스럽게 이끌어 나갑니다.
* 입력한 문장 중 어색하거나 문법적으로 틀린 부분이 있으면 한국어로 친절히 교정(Feedback) 및 설명을 제공합니다.

### 📓 3. [한국어] 섞어 쓰기 감지 및 자동 단어장 누적
* 문장을 작성하다가 모르는 단어가 있을 때 사전에서 찾을 필요 없이 한국어 단어로 편하게 적거나 대괄호(예: `[산책]`)를 씌워 입력하세요.
* AI가 문맥을 분석하여 번역, 올바른 외국어 표기, 발음(한글 및 히라가나 표기), 적절한 예문을 생성해 우측 **학습 단어장**에 자동으로 추가합니다.

### 🔊 4. 무료 네이티브 TTS 음성 읽기
* 별도의 유료 음성 API 없이 브라우저 내장 **Web Speech API**를 사용하여 무료로 정확한 원어민 음성을 들을 수 있습니다.
* 괄호 안의 요미가나(예: `公園(こうえん)`)는 오디오 재생 시 똑똑하게 걸러내어, 발음이 끊기거나 중복되지 않고 매끄러운 단어 음성만을 재생합니다.

### 💾 5. 영구 저장 및 간편한 백업 (CSV / TXT)
* **Express 백엔드**가 단어 데이터를 로컬 JSON 파일로 안전하게 기록합니다.
* **엑셀 호환 CSV 내보내기**: 단어장을 Excel에서 깨짐 현상 없는 **UTF-8 BOM 인코딩** CSV 파일로 내려받을 수 있습니다.
* **대화 백업**: 나눈 전체 대화 내용을 깔끔한 메모장 텍스트 파일(`.txt`)로 가볍게 저장할 수 있습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

### Frontend
* **Core**: HTML5, CSS3, Vanilla JavaScript
* **API**: Web Speech API (`SpeechSynthesis`)
* **Icons**: Lucide Icons CDN

### Backend
* **Runtime**: Node.js
* **Framework**: Express.js
* **Middleware**: CORS

### LLM
* **Provider**: Google AI Studio (Gemini 1.5 Flash API)

---

## 🚀 설치 및 시작 방법 (Installation)

### 1. 레포지토리 복사 및 폴더 이동
```bash
git clone https://github.com/YOUR_GITHUB_ID/lingotutor.git
cd lingotutor
```

### 2. 패키지 설치
최초 실행 시 install.bat 파일을 더블클릭하여 패키지 설치를 완료해 주세요.

### 3. 프로젝트 구동
start.bat 파일을 더블클릭하여 백엔드 서버 구동 및 웹 브라우저 접속을 한 번에 실행합니다.
* 접속 주소: **`http://localhost:5000`**

---

## 🔑 Gemini API Key 설정 가이드
본 프로젝트는 비용 지출이 없는 무료 개인 튜터를 지향합니다.
1. [Google AI Studio](https://aistudio.google.com/)에 로그인합니다.
2. **"Create API Key"** 버튼을 클릭하여 개인용 API Key를 무료로 발급받습니다. (무료 등급: 분당 15회, 하루 1,500회 호출 가능)
3. LingoTutor 웹 페이지 왼쪽 하단의 **[API 키 관리]**를 열고 발급받은 키를 등록하여 즉시 대화를 진행할 수 있습니다.
   * *등록한 API 키는 본인의 브라우저 로컬 스토리지(`localStorage`)에만 안전하게 기록되며 서버로 전송되거나 공유되지 않습니다.*

---

## 📂 프로젝트 구조 (Directory Structure)
```text
lingotutor/
├── vocab_en.json        # 영어 단어장 로컬 로깅 파일 (자동 생성)
├── vocab_ja.json        # 일본어 단어장 로컬 로깅 파일 (자동 생성)
├── app.js               # 프론트엔드 비즈니스 로직 및 API 연동 스크립트
├── index.html           # 메인 애플리케이션 HTML 뷰
├── package.json         # Node.js 프로젝트 명세 및 의존성 설정
├── README.md            # 프로젝트 소개 파일 (본 문서)
├── server.js            # Node.js Express API & 정적 파일 서빙 백엔드
└── style.css            # 가독성 중심의 화이트 앤 블랙 CSS 테마
```

---

## 📄 라이선스 (License)
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
