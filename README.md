# boardProject nest version

## 목적
nest 프로젝트 설계 구조 및 TypeORM 학습 목적
REST API 구조로 프론트엔드 재활용을 통해 Nest만 집중한 경험 목적

## 설치 패키지
- @nestjs/common 11.0.1
- @nestjs/config 4.0.2
- @nestjs/core 11.0.1
- @nestjs/jwt: 11.0.0
- @nestjs/passport 11.0.5
- @nestjs/platform-express 11.1.6
- @nestjs/typeorm 11.0.0
- bcrypt 6.0.0
- cookie-parser 1.4.7
- cross-env 10.0.0
- dayjs 1.11.18
- fs-extra 11.3.2
- helmet 8.1.0
- multer 2.0.2
- mysql2 3.15.0
- passport 0.7.0
- passport-google-oauth20 2.0.0
- passport-kakao 1.0.1 **moderate. passport-oauth2 1.6.1 문제**
- passport-local 1.0.0
- passport-naver 1.0.6
- pm2 6.0.13
- redis 5.8.2
- reflect-metadata 0.2.2
- rxjs 7.8.1
- sharp 0.34.4
- uuid 13.0.0
- winston 3.17.0
- winston-daily-rotate-file 5.0.0
- dev
  - @nestjs/cli 11.0.0
  - @nestjs/schematics 11.0.0
  - @nestjs/testing 11.0.1
  - @types/express 5.0.0
  - @types/jest 30.0.0
  - @types/node 22.10.7
  - @types/supertest 6.0.2
  - eslint 9.18.0
  - eslint-config-prettier 10.0.1
  - eslint-plugin-prettier 5.2.2
  - jest 30.1.3
  - nodemon 3.1.10
  - prettier 3.4.2
  - supertest 7.1.4
  - ts-jest 29.4.4
  - ts-node 10.9.2
  - tsconfig-paths 4.2.0
  - typescript 5.7.3
  - typescript-eslint 8.20.0


## 프로젝트 구조 설계
- src/ 하위로 각 모듈, common, config 디렉토리 위치.
- 각 모듈은 하위에 controllers/ dtos/ entities/ repositories/ services/ 디렉토리를 갖고 파일은 module만 존재. 필요에 따라 guards/ 도 추가.   
- config/ 하위로는 각 용도에 맞게 디렉토리 생성 후 분리.   
- common/ 하위에는 공통 상수로 constants/, Custom Decorator를 모아둔 decorators/, customException을 모아둔 exceptions/, 각 필터를 모아둔 filters/, guards/, Redis와 같은 공통 사용 서비스를 모아둔 services/ 로 분리.   
- 최종 src/ 하위 구조는 common/, config/, auth/, member/, board/, image-board/, comment/ 로 설계. auth에는 순수 인증 / 인가에 대한 것만 배치.   


---

# History

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