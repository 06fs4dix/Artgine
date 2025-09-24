#include <emscripten/fetch.h>
#include "STL.h"


// 🔷 글로벌 변수 추가
struct CheckRequest {
    vector<string> checkKeywords;
    string url;
    bool processed;
    
    CheckRequest(const string& _url, const vector<string>& _keywords) : url(_url), checkKeywords(_keywords), processed(false) {}
};

vector<CheckRequest> gCheckRequests; // 여러 요청을 관리
bool gCheck = false;
int gRequestId = 0; // 요청 ID 관리
// 🔷 소스 코드 파싱 콜백
void handle_source_fetch_success(emscripten_fetch_t* fetch) {
    string sourceCode(fetch->data, fetch->numBytes);
    string fetchUrl(fetch->url);
    
    // 해당 URL의 요청 찾기
    for (auto& request : gCheckRequests) {
        if (request.url == fetchUrl && !request.processed) {
            // 3. 키워드 검색 (콜백에서 처리)
            int matchCount = 0;
            
            // 4. 각 키워드가 소스 코드에 포함되어 있는지 확인
            for (const string& keyword : request.checkKeywords) {
                if (sourceCode.find(keyword) != string::npos) {
                    matchCount++;
                }
            }
            
            // 5. 매치 결과 처리
            if (matchCount == 0 || matchCount != request.checkKeywords.size()) {
                // 매치가 없거나, 매치된 개수가 키워드 개수와 다르면 gCheck를 true로 설정
                gCheck = true;
                
                
            
            }
            //printf("URL: %s, 예상: %d개, 찾음: %d개\n", request.url.c_str(), (int)request.checkKeywords.size(), matchCount);
            
            request.processed = true; // 처리 완료 표시
            break;
        }
    }
    
    emscripten_fetch_close(fetch);
}
void handle_fetch_failure(emscripten_fetch_t* fetch) {
    printf("[Fetch 실패] URL: %s, 상태코드: %d\n", fetch->url, fetch->status);
    emscripten_fetch_close(fetch);
    gCheck=true;
}
// 🔷 초기화 리스트를 받는 함수 (한 줄 사용 가능)
bool SourceCWASMChk(string _url, std::initializer_list<string> _keywords)
{
    // 1. 초기화 리스트를 벡터로 변환하여 요청 목록에 추가
    vector<string> checkKeywords(_keywords.begin(), _keywords.end());
    gCheckRequests.emplace_back(_url, checkKeywords);
    
    // 2. URL에서 소스 파일 패치
    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    strcpy(attr.requestMethod, "GET");
    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY;
    attr.onsuccess = handle_source_fetch_success;
    attr.onerror = handle_fetch_failure;
    
    emscripten_fetch(&attr, _url.c_str());
    
    return true; // fetch 요청 성공 (비동기로 처리됨)
}

// 🔷 버전 체크를 위한 구조체
struct VersionInfo {
    int version;
    bool processed;
    string url;
    bool isRootFile; // 루트 파일인지 구분
    
    VersionInfo(const string& _url, bool _isRoot) : url(_url), version(0), processed(false), isRootFile(_isRoot) {}
};

// 🔷 루트 파일의 버전 정보를 저장할 구조체
struct RootVersionInfo {
    map<int, int> versionMap; // 버전별 상태 (0 또는 1)
    bool processed;
    string targetVersion; // 체크할 대상 버전
    
    RootVersionInfo() : processed(false) {}
};

vector<VersionInfo> gVersionRequests; // 버전 체크 요청들을 관리
RootVersionInfo gRootVersionInfo; // 루트 파일의 버전 정보 저장

// 🔷 버전 체크 성공 콜백
void handle_version_fetch_success(emscripten_fetch_t* fetch) {
    string jsonData(fetch->data, fetch->numBytes);
    string fetchUrl(fetch->url);
    
    // 해당 URL의 요청 찾기
    for (auto& request : gVersionRequests) {
        if (request.url == fetchUrl && !request.processed) {
            // JSON 파싱 (루트 파일만 처리)
            if (request.isRootFile) {
                // 루트 파일 (version.json) - 모든 버전 정보 파싱
                // 예: {"1":0, "2":1, "3":0}
                size_t pos = 0;
                while (pos < jsonData.length()) {
                    // 버전 번호 찾기
                    size_t versionStart = jsonData.find("\"", pos);
                    if (versionStart == string::npos) break;
                    
                    size_t versionEnd = jsonData.find("\"", versionStart + 1);
                    if (versionEnd == string::npos) break;
                    
                    string versionStr = jsonData.substr(versionStart + 1, versionEnd - versionStart - 1);
                    int versionNum = stoi(versionStr);
                    
                    // 값 찾기
                    size_t valueStart = jsonData.find(":", versionEnd);
                    if (valueStart == string::npos) break;
                    
                    size_t valueEnd = jsonData.find_first_of(",\n\r}", valueStart);
                    if (valueEnd == string::npos) break;
                    
                    string valueStr = jsonData.substr(valueStart + 1, valueEnd - valueStart - 1);
                    int value = stoi(valueStr);
                    
                    // 맵에 저장
                    gRootVersionInfo.versionMap[versionNum] = value;
                    
                    pos = valueEnd + 1;
                }
                gRootVersionInfo.processed = true;
            }
            
            request.processed = true;
            break;
        }
    }
    
    // 모든 요청이 처리되었는지 확인
    bool allProcessed = true;
    for (const auto& request : gVersionRequests) {
        if (!request.processed) {
            allProcessed = false;
            break;
        }
    }
    
    // 모든 요청이 처리되면 버전 체크
    if (allProcessed && gVersionRequests.size() >= 1 && gRootVersionInfo.processed) {
        // _version 파라미터로 받은 키값을 찾아서 처리
        string targetVersion = gRootVersionInfo.targetVersion;
        
        // 문자열을 정수로 변환
        try {
            int versionNum = stoi(targetVersion);
            
            // 해당 버전이 맵에 있는지 확인
            auto it = gRootVersionInfo.versionMap.find(versionNum);
            if (it != gRootVersionInfo.versionMap.end()) {
                int versionStatus = it->second;
                
                if (versionStatus == 0) {
                    //printf("[I] Version %s: PASS\n", targetVersion.c_str());
                } else if (versionStatus == 1) {
                    printf("[W] Version %s: WARNING - Update needed\n", targetVersion.c_str());
                } else if (versionStatus == -1) {
                    printf("[E] Version %s: ERROR - Invalid version\n", targetVersion.c_str());
                    gCheck = true;
                }
            } else {
                printf("[E] Version %s not found in root file\n", targetVersion.c_str());
                gCheck = true;
            }
        } catch (const std::exception& e) {
            printf("[E] Invalid version format: %s\n", targetVersion.c_str());
            gCheck = true;
        }
    }
    
    emscripten_fetch_close(fetch);
}

// 🔷 버전 체크 실패 콜백
void handle_version_fetch_failure(emscripten_fetch_t* fetch) {
    emscripten_fetch_close(fetch);
}

void VersionChk(string _rootFile, string _version)
{
    // 문자열에 "06fs4dix"가 포함되지 않으면 어딘가 조작한거다
    if(_rootFile.find("06fs4dix") == string::npos) {
        gCheck=true;
    }

    // 기존 요청 목록 초기화
    gVersionRequests.clear();
    gRootVersionInfo.versionMap.clear();
    gRootVersionInfo.processed = false;
    gRootVersionInfo.targetVersion = _version; // 체크할 버전 저장
    
    // 루트 파일만 요청 (버전 정보를 가져오기 위해)
    gVersionRequests.emplace_back(_rootFile, true);   // version.json
    
    // 루트 파일 패치
    emscripten_fetch_attr_t attr;
    emscripten_fetch_attr_init(&attr);
    strcpy(attr.requestMethod, "GET");
    attr.attributes = EMSCRIPTEN_FETCH_LOAD_TO_MEMORY;
    attr.onsuccess = handle_version_fetch_success;
    attr.onerror = handle_version_fetch_failure;
    
    emscripten_fetch(&attr, _rootFile.c_str());
}


bool FetchgCheck()
{
    return gCheck;
}