# boardProject nest version

## 목적
nest 프로젝트 설계 구조 및 TypeORM 학습 목적
REST API 구조로 프론트엔드 재활용을 통해 Nest만 집중한 경험 목적

## 프로젝트 환경 및 패키지

| Category                | Tech Stack                                                                                                                                                                                                                                |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Framework               | nest 11 ( express )                                                                                                                                                                                                                       |
| DB, ORM                 | - MySQL <br/> - TypeORM 0.3.27( @nestjs/typeorm 11.0.0 ) <br/> - typeorm-transactional 0.5.0 <br/> - mysql2 3.15.0 <br/> - redis 5.8.2                                                                                                    |
| Auth                    | - @nestjs/jwt 11.0.0 <br/> - bcrypt 6.0.0 <br/> - passport 0.7.0 <br/> - passport-google-oauth20 2.0.0 <br/> - passport-kakao 1.0.1 **(moderate. passport-oauth2 1.6.1 이슈 존재)** <br/> - passport-local 1.0.0 <br/> - passport-naver 1.0.6 |
| Validation              | - class-transformer 0.5.1 <br/> - class-validator 0.14.2                                                                                                                                                                                  |
| Logging                 | - winston 3.17.0 <br/> - winston-daily-rotate-file 5.0.0                                                                                                                                                                                  |
| File / Image            | - fs-extra 11.3.2 <br/> - multer 2.0.2 <br/> - sharp 0.34.4                                                                                                                                                                               |
| Configuration / Utility | - cross-env 10.0.0 <br/> - cookie-parser 1.4.7 <br/> - dayjs 1.11.18 <br/> - helmet 8.1.0 <br/> - uuid7 1.0.2                                                                                                          |
| Process / Deplyment     | - pm2 6.0.13
| Testing / Dev           | - jest 29.7.0 <br/> - ts-jest 29.4.4 <br/> - supertest 7.1.4 <br/> - nodemon 3.1.10 <br/> - tsc-alias 1.8.16                                                                                                                              |


## 프로젝트 구조 설계
- src/ 하위로 각 모듈, common, config 디렉토리 위치.
- 각 모듈은 하위에 controllers/ dtos/ entities/ repositories/ services/ 디렉토리를 갖고 파일은 module만 존재. 필요에 따라 guards/ types/ 등을 추가.   
- config/ 하위로는 각 용도에 맞게 디렉토리 생성 후 분리.   
- common/ 하위에는 공통 상수로 constants/, Custom Decorator를 모아둔 decorators/, customException을 모아둔 exceptions/, 각 필터를 모아둔 filters/, guards/, Redis와 같은 공통 사용 서비스를 모아둔 services/ 로 분리.   
- 최종 src/ 하위 구조는 common/, config/, auth/, member/, board/, image-board/, comment/ 로 설계. auth에는 순수 인증 / 인가에 대한 것만 배치.   
- 테스트는 모듈별 디렉토리 생성. 그 하위로 integration/, unit/으로 나눠 분리.   
- 테스트에서만 사용되는 Module, util은 test/ 하위에서 별도의 디렉토리로 관리.   
- .env => production, .env.development => dev, .env.test => test로 환경 분리.   
- swagger는 기본 응답 구조 및 예상 오류 응답 문서화.


---

# History

<br/>

## 1차 프로젝트 수행 기간
> 25/09/23 ~ 25/10/23

## 25/09/23
> 프로젝트 시작   
> 기본 모듈 구조만 생성

<br/>

## 25/09/24
> 설정 파일 생성 및 작성   
>> winston logger 설정   
>> Redis 설정   
>> TypeORM 설정   
>> Exception Filter 생성 및 정의   
>> Custom Excpetion 정의   
>> Response Status 상수 정의   
> JWT TokenProvider 생성 및 정의   
> Redis Service 생성 및 정의   
> package.json scripts 정의   
> tsconfig.json paths 정의

<br/>

## 25/09/25
> 모든 요청에 대한 토큰 검증을 수행하는 JwtAuthGuard, 권한 제어 필요 시 권한을 체크하는 AuthGuard, AuthGuard 체크시 연동되는 @Roles Custom Decorator 추가.   
> 각 모듈에 Entity, Repository 생성 및 Module에 정의.   
> docker-compose 작성 (dev, test 용도.)   
> 파일 업로드 Interceptor 생성. 분류별로 profile, board로 나눠서 2개의 Interceptor로 설계.   
> resizingService, fileService 생성.   
> 원본 업로드는 Interceptor를 통해서 처리되고 리사이징은 Service에서 호출하는 구조로 설계.   
> docker-compose에서 데이터베이스 비밀번호 하드코딩에서 환경변수 사용으로 수정.   
> jest 버전 @29로 맞춰주고 typeorm 의존성 누락되었어서 추가.   
> validationPipe Global 설정 추가.   
> CORS 설정 추가.   

<br/>

## 25/09/26
> OAuth passport 전체 구현.   
> 로그인, 로그아웃 요청에 대해서는 Auth 모듈로 이동.   
> Module간의 순환참조도 발생할 수 있다고 해서 로그인, 로그아웃을 확실하게 인증 모듈로 분리함으로써 Member 모듈이 Auth 모듈을 참조하지 않도록 개선.

<br/>

## 25/09/27
> 경로 문제 발생   
>> 서버 실행 중 오류가 발생.   
>> 빌드된 main.js를 확인했을 때 경로가 상대경로로 변형되지 않고 그대로 유지되는 것을 확인.   
>> tsc-alias 패키지 dev 로 설치.   
>> tsconfig.build.json에 paths 재정의로 문제 해결.   
> 모듈 및 의존성 개선   
>> RedisModule, RedisService간 문제 발생.   
>> RedisService가 REDIS_CLIENT를 주입받으려 하는 시점에 RedisModule의 factory가 아직 완료되지 않을 수 있고,   
>> factory가 Promise를 반환하기에 RedisService가 생성될때까지 기다리지 않는 경우가 발생할 수 있다.   
>> 그래서 기존에는 RedisModule의 provider로 RedisService를 같이 작성하게 되어 이 타이밍이 어긋나게 되면 문제가 발생할 여지가 있었던 것.   
>> 이것을 별도의 RedfisServiceModule로 분리하고 RedisModule은 REDIS_CLIENT만을 반환, RedisServiceModule에서는 RedisService를 제공하도록 개선해서 문제를 해결.   
> profile별 env 주입 문제   
>> dev 스크립트로 실행했음에도 .env.development의 환경변수를 제대로 가져오지 못하는 문제 발생.   
>> ConfigModule.forRoot({ isGlobal: true })로 설정했었기 때문에 .env만 읽어서 문제가 발생한 것.   
>> envFilePath를 정의해서 profile별로 읽어올 수 있도록 수정.   

<br/>

## 25/09/29
> 로그인, oAuth 브라우저 테스트
> member 기능 구현 및 테스트 작성
> imageBoard -> board -> comment 순서로 진행

<br/>

## 25/09/30
> Member Module Controller, Service 메서드 및 DI 추가.   
> 서버 실행 시 crash 발생.  

<br/>

## 25/10/01
> 문제 원인 파악.   
>> 인증 / 인가 및 권한 제어를 Guard로 처리하고 있는데 그 중 권한 제어를 위한 RolesGuard가 문제.   
>> 인증 / 인가를 처리하는 JwtAuthGuard의 부담을 줄이고자 권한 조회는 RolesGuard에게 넘겼었는데, 그러다보니 RolesGuard가 AuthRepository를 주입받아야 하는 상황이 발생.   
>> 근데 Member Module 역시 Controller에서 권한 제어를 위해 RolesGuard를 주입 받아야 하게 되면서 순환 참조 발생으로 인해 서버가 crash.   
>> 이 문제 해결에 대해 고민해봤으나 Member Module에서 RolesGuard를 무조건 참조할 수 밖에 없는 상황에서 참조에 대한 타협이 불가능한 것으로 판단.   
>> Global로 APP_GUARD로 설정된 JwtAuthGuard는 다른 모듈이 참조할 이유가 없기 때문에 JwtAuthGuard에서 권한 조회까지 수행 후 req.user에 roles로 권한 배열을 담도록 수정.   
> MemberController, MemberService, MemberRepository 전체 구현.   
> 파일 업로드 브라우저 테스트 확인.

<br/>

## 25/10/02 ~ 25/10/03
> Repository 테스트 코드 작성 중 문제 발생.   
>> 1. jest에서 path alias 인식 불가 문제
>>> tsconfig.json에 명시되어 있기 때문에 이걸로 될 줄 알았으나 불가능.   
>>> Cursor에 문제 제시 후 예제 코드를 본 결과 jest.config.js로 분리된 설정이 필요하다고 해서 체크했으나 실패.   
>>> 여러 설정을 계속 변경해가며 체크해봤으나 인식 불가.   
>>> 결국 10/2에 문제 해결하지 못하고 마무리.   
>>> 10/3일에 블로그 검색 시작.   
>>> 여러 포스팅을 보면서 상황에 맞게 조합하며 테스트.   
>>> jest.config.js를 제거하고 package.json의 "jest"에 추가 작성하는 것으로 최종 문제 해결.   
>>> 주의사항으로 rootDir에 test 파일 인식을 위해 test로 잡아두었기 때문에 moduleNameMapper의 <rootDir> 은 test 디렉토리임을 인지해야 함.   
>> 2. uuid 인식 불가 문제
>>> jest가 uuid import를 제대로 인식하지 못하는 문제.   
>>> Must use import to load ES Module 이라는 로그가 계속 발생.   
>>> uuid 버전은 11 버전.   
>>> 이 문제는 uuid 11 버전이 순수 ESM 환경이기 때문에 Nest와 같은 CJS 환경에서는 Jest가 제대로 변환하지 못하는 문제.   
>>> Express에서는 잘 사용했는데? 싶었지만 Express에서도 type: module을 통해 ESM 환경으로 전환했기에 사용이 가능했던 것.   
>>> Nest 자체에서는 문제가 없지만 완전한 CJS 환경인 Jest에서는 문제가 발생하는 것.   
>>> Jest를 ESM으로 transform 하면 된다는 얘기도 있었는데 이것저것 시도해봤지만 해결 실패.   
>>> 결국 uuidv7으로 버전을 수정하는 것으로 문제 해결.   
>>> uuid 사용 목적이 단순히 v4를 통해 난수 생성하는것에 목적이 있었고, uuidv7에서 취약점도 없었기 때문에 문제가 없을거라고 판단.   
>>> 문제는 앞으로 Nest를 하면서 이런 순수 ESM 패키지를 만났을 때 어떻게 할 것이냐가 문제.   
>>> 아직까지는 마땅한 해결책이 보이지 않아서 걱정..
> member.repository.spec.ts에서 임시 테스트 통과.

<br/>

## 25/10/04
> MemberRepository, AuthRepository, MemberService 통합 테스트   
> Nest + Jest 환경에서의 @Transactional() Decorator 문제 발생.
>> @Transactional()이 정의되어 있는 메서드에 대한 단위 테스트가 불가능하다고 함.   
>> typeorm-transactional 패키지가 CLS 기반으로 TransactionContext를 요구하기 때문에 단위 테스트에서도 반드시 initializeTransactionalContext()와 addTransactionalDataSources()가 필요하기 때문.   
>> 이 둘을 띄우게 되면 단위 테스트가 아니라 통합 테스트가 되기 때문에 무시하고 테스트하는게 불가능하다고 함.   
>> 그래서 다른 memberService 메서드들은 단위 테스트를 해야할 만큼의 로직이 없기 때문에 memberService의 단위 테스트를 생략.   
>> 단위 테스트를 수행하지 않기 때문에 예외 발생시 롤백 등의 검증은 통합 테스트에서 부분 mocking을 통해 처리.

<br/>

## 25/10/08
> Member Controller E2E 테스트   
> Sharp, FileService Mocking 후 테스트.

<br/>

## 25/10/13
> member Controller E2E 테스트 수정
> board.controller, board.service 기본 틀 작성

<br/>

## 25/10/14
> swagger 추가
>> 패키지 추가 및 main.ts 기본 설정 추가. 정상 동작 확인

<br/>

## 25/10/15
> board.controller swagger 정의 추가.   
> board.repository 구현 및 테스트.   
> board.service 구현 및 단위 / 통합 테스트.   
> board.controller 구현. userStatusDTOMapper, auth.utils 추가.   

<br/>

## 25/10/16
> Board Controller E2E 테스트
> imageBoard Controller, service 기본 틀 작성

<br/>

## 25/10/17
> ImageBoardRepository, ImageDataRepository, ImageBoardService 구현.   
> ImageBoardMapper, ImageDataMapper, 각 DTO 생성

<br/>

## 25/10/20
> ImageBoardRepository 테스트   
> ImageBoardService unit, integration 테스트

<br/>

## 25/10/21
> ImageBoardController 구현   
> ImageBoardController E2E 테스트
> ImageBoard 마무리.

<br/>

## 25/10/22
> comment Controller, service, repository 기본 틀 작성
> comment Repository, service 구현   
> comment Repository integration, comment service unit, integration 테스트.   

<br/>

## 25/10/23
> 전체 컨트롤러 대상 Exception response 문서화.   
> 문서화 처리를 위해 validation 오류에 대해서 메시지를 상수화한 constants 생성.   
> validation 오류 반환 케이스 문서화를 위해 모듈별 example.ts 생성.   
> comment controller E2E 테스트   
> 프로젝트 마무리.

<br/>

## 25/10/25
> 이미지 출력 관련 file display 누락된 것 추가.   
> file 모듈을 별도의 디렉토리로 분리.   
> file.service와 resizing.service를 해당 디렉토리로 이동.   
> file.controller 생성.   
> FileModule을 app.module에 추가.   
> 브라우저에서 이미지 정상 출력 확인.