# AWS デプロイガイド(AWS CLI + Terraform・初心者向け)

このアプリ(React + Spring Boot + PostgreSQL)を、**マネジメントコンソールを手でクリックせず、コマンドラインだけで** AWS に構築・デプロイするためのガイド。AWS・Terraform・IaC を初めて触る人が、用語の意味から順に理解して進められるように書いている。

> **このドキュメントの位置づけ**
> 現時点では「手順と考え方」をまとめたもので、Terraform のコードや Dockerfile はまだ無い。実装は [10. 進め方](#10-進め方issue-の切り方) のとおり、Issue を分けて順番に作る。
> 料金・画面・コマンドのオプションは変わることがあるので、迷ったら各章末の公式ドキュメントを一次情報として確認すること。

## 目次

1. [まず全体像をつかむ](#1-まず全体像をつかむ)
2. [このアプリの AWS 構成](#2-このアプリの-aws-構成)
3. [費用の目安と事故防止](#3-費用の目安と事故防止)
4. [準備1: AWS アカウントと認証設定](#4-準備1-aws-アカウントと認証設定)
5. [準備2: ツールのインストール](#5-準備2-ツールのインストール)
6. [Terraform の基礎](#6-terraform-の基礎)
7. [このアプリ特有の注意点(デプロイ前に直すこと)](#7-このアプリ特有の注意点デプロイ前に直すこと)
8. [デプロイの流れ](#8-デプロイの流れ)
9. [困ったとき・後片付け](#9-困ったとき後片付け)
10. [進め方(Issue の切り方)](#10-進め方issue-の切り方)
11. [決めてほしいこと](#11-決めてほしいこと)

---

## 1. まず全体像をつかむ

### 1.1 AWS とは

Amazon が提供するクラウド。サーバー、データベース、ネットワークなどを、必要な分だけ借りて、使った時間・量で料金を払う。自分のパソコンで動かしている「フロント + バックエンド + PostgreSQL」を、AWS 上の部品に置き換えるのが今回のデプロイ。

### 1.2 IaC(Infrastructure as Code)とは

インフラ(サーバー・DB・ネットワーク)の構成を、**画面のクリックではなくコード(テキストファイル)で書く**やり方。

| 手作業(コンソール) | IaC |
|---|---|
| 手順が人の記憶・スクリーンショットに残る | 構成がファイルに残り、Git で履歴・レビューができる |
| 同じ環境をもう一度作るのが大変 | `apply` で同じ環境を何度でも再現できる |
| どこをいじったか分からなくなる | 変更内容を実行前に `plan` で確認できる |
| 後片付けで消し忘れ → 課金が続く | `destroy` で作ったものをまとめて消せる |

このリポジトリが「Issue → PR → レビュー」で運用されているのと同じ発想を、インフラにも当てはめる。

### 1.3 Terraform と AWS CLI の役割分担

| ツール | 役割 | このガイドでの使い方 |
|---|---|---|
| **Terraform** | 「あるべきインフラの姿」をコードで書き、AWS に反映する | VPC・RDS・ECS・S3・CloudFront などの**作成・変更・削除** |
| **AWS CLI** | AWS の API をコマンドから呼ぶ道具 | ログイン(認証)、状態確認、Docker イメージの登録、画面ファイルのアップロード、ログ閲覧 |

つまり「**入れ物(インフラ)は Terraform、中身(アプリ)の配布と確認は AWS CLI**」と覚えるとよい。

### 1.4 Terraform の用語

| 用語 | 意味 |
|---|---|
| **provider** | Terraform が操作する相手のプラグイン。今回は AWS(`hashicorp/aws`) |
| **resource** | 作りたい部品1つ(例: S3 バケット、DB)。コードの中心 |
| **data** | すでにある情報を読み取るだけ(例: アカウント ID、最新の AMI) |
| **variable** | 外から渡せる設定値(例: リージョン、環境名) |
| **output** | 実行後に表示したい値(例: CloudFront の URL) |
| **module** | 複数の resource をまとめた再利用部品。最初は使わなくてよい |
| **state** | Terraform が「今 AWS に何を作ったか」を記録するファイル(`terraform.tfstate`)。**最重要** |
| **plan** | 「実行したら何が変わるか」の予行演習。実際には何も変えない |
| **apply** | plan の内容を実際に AWS へ反映する |
| **destroy** | 管理しているものをすべて削除する |

### 1.5 AWS の用語(この構成に出てくるものだけ)

| 用語 | 意味 | 例えると |
|---|---|---|
| **リージョン** | AWS のデータセンター群の地域。東京は `ap-northeast-1` | 国・地域 |
| **アベイラビリティゾーン(AZ)** | リージョン内の独立した建物単位 | 同じ地域の別の建物 |
| **IAM** | 「誰が何をしてよいか」の権限管理 | 社員証と入館権限 |
| **VPC** | 自分専用の仮想ネットワーク | 自社ビルの敷地 |
| **サブネット** | VPC を区切った区画。インターネットに出られる「パブリック」と、出られない「プライベート」がある | 敷地内の部屋 |
| **セキュリティグループ** | 通信を許可するルール(誰からどのポートへ) | 部屋ごとの鍵 |
| **S3** | ファイル置き場。画面(HTML/JS/CSS)を置く | 倉庫 |
| **CloudFront** | 世界中に画面を速く配る CDN。HTTPS もここで提供 | 配送センター |
| **ECR** | Docker イメージの保管庫 | 荷物の保管庫 |
| **ECS / Fargate** | Docker コンテナを動かす仕組み。Fargate はサーバー管理が不要な方式 | 荷物を動かしてくれる業者 |
| **ALB** | 外からの通信をコンテナに振り分ける入口(ロードバランサ) | 受付 |
| **RDS** | AWS が管理してくれる PostgreSQL | 管理人付きの DB |
| **Secrets Manager** | パスワードなどの秘密情報の金庫 | 金庫 |
| **CloudWatch Logs** | アプリのログの置き場 | 日報 |

---

## 2. このアプリの AWS 構成

学習用として、**よくある標準構成**を選ぶ(理由は [11 章](#11-決めてほしいこと) 参照)。

```
                      ブラウザ
                         │ HTTPS
                         ▼
                 ┌──────────────┐
                 │  CloudFront  │  1つのURLで画面もAPIも配る(同一オリジン)
                 └──────┬───────┘
          /(画面)       │        /api/*(API)
        ┌───────────────┴──────────────┐
        ▼                              ▼
 ┌─────────────┐              ┌──────────────────┐
 │ S3          │              │ ALB              │  パブリックサブネット
 │ React ビルド │              └────────┬─────────┘
 └─────────────┘                       ▼
                              ┌──────────────────┐
                              │ ECS Fargate      │  Spring Boot (8080)
                              │ (ECR のイメージ)  │  ログ → CloudWatch Logs
                              └────────┬─────────┘
                                       │ JDBC 5432(ECS からのみ許可)
                                       ▼
                              ┌──────────────────┐
                              │ RDS PostgreSQL   │  プライベートサブネット
                              │ (パスワードは     │  (インターネットに出口なし)
                              │  Secrets Manager)│
                              └──────────────────┘
```

ポイント:

- **画面と API を同じ CloudFront のURLで配る。** フロントは API を `/api/...` で呼んでおり(開発時は Vite が `/api` を外してバックエンドへ転送している)、本番でも同じ形にすれば CORS の問題が起きない。CloudFront で `/api/*` を ALB へ流し、`/api` を外す処理を入れる(→ [7.2](#72-api-のパス-api-を-cloudfront-で処理する))。
- **DB は外から直接つなげない。** RDS はプライベートサブネットに置き、セキュリティグループで ECS からの通信だけを許可する。
- **NAT Gateway は使わない。** 月 40 ドル前後かかるため、ECS をパブリックサブネットに置き(パブリック IP を付与)、セキュリティグループで「ALB からの通信だけ」を許可して守る。

---

## 3. 費用の目安と事故防止

AWS は**使った分だけ課金**される。「作ったまま忘れる」のが初心者の最大の事故原因。

### 3.1 月額の目安(東京リージョン・動かしっぱなしの場合)

> 以下は概算の目安で、為替や価格改定で変わる。正確な値は [AWS Pricing Calculator](https://calculator.aws/) で見積もること。

| 部品 | 目安 |
|---|---|
| ALB | 約 20 ドル(ほぼ固定費) |
| ECS Fargate(0.25 vCPU / 0.5 GB を1台) | 約 10 ドル |
| RDS PostgreSQL(`db.t4g.micro` + 20 GB) | 約 15〜20 ドル |
| S3 / CloudFront / ECR / ログ | 数ドル以下(アクセスが少なければ) |
| **合計** | **おおむね 50 ドル前後 / 月** |

新規アカウントには無料枠やクレジットの仕組みがあるが、条件が変わるので [AWS 無料利用枠](https://aws.amazon.com/jp/free/) で最新を確認すること。**使わない間は `terraform destroy` で消す**運用にすれば、実際の請求は動かした時間分だけで済む。

### 3.2 必ずやる安全策

1. **予算アラートを最初に設定する**(→ [4.2](#42-予算アラートを先に作る))。
2. **ルートユーザーは日常使わない。** MFA(多要素認証)を必ず設定する。
3. **アクセスキー(`AKIA...`)を作らない。** 本ガイドは IAM Identity Center(SSO)の**短期認証**を使う。長期キーはコード・ログ経由で漏れると、勝手にサーバーを立てられて高額請求される典型的な事故につながる。
4. **作業が終わったら `terraform destroy`。** そのあとコンソールの請求ページで残りがないか確認する。
5. **`terraform apply` / `destroy` は人間が `plan` を読んでから実行する。** Claude Code には `terraform plan` までを任せ、`apply` / `destroy` は自分で実行するのを推奨する。

---

## 4. 準備1: AWS アカウントと認証設定

ここだけは(アカウント作成の都合上)ブラウザでの操作が必要。**最初の1回だけ**で、以降はコマンドだけで進められる。

### 4.1 AWS アカウントを作る

1. <https://aws.amazon.com/jp/> から「無料アカウントを作成」。メールアドレス、クレジットカード、電話番号が必要。
2. 作成したメールアドレスでログインした状態が**ルートユーザー**。最初に **MFA を設定**する(コンソール右上のアカウント名 → セキュリティ認証情報 → MFA の割り当て)。
3. 以降、ルートユーザーでのログインは請求設定など限られた場面だけにする。

### 4.2 予算アラートを先に作る

コンソールの「Billing and Cost Management」→「Budgets」→ 月額予算(例: 20 ドル)を作り、実績が 80% を超えたらメール通知するように設定する。

### 4.3 日常用のユーザーを作る(IAM Identity Center)

ルートユーザーの代わりに、日常作業用の「人」を作る。AWS CLI から**短期の認証情報**でログインできるようにするため、IAM Identity Center(旧 AWS SSO)を使う。

コンソールで次を行う(1回だけ)。

1. リージョンを**東京(ap-northeast-1)**にして「IAM Identity Center」を開き、「有効にする」。
2. 「ユーザー」→ 自分用のユーザーを作成(メールアドレスに招待が届くので、パスワードと MFA を設定)。
3. 「許可セット(Permission sets)」→ `AdministratorAccess`(AWS 管理ポリシー)を選んで作成。
4. 「AWS アカウント」→ 自分のアカウントを選び、「ユーザーまたはグループを割り当て」で 2 のユーザーと 3 の許可セットを紐づける。
5. IAM Identity Center の画面にある **「AWS access portal URL」**(`https://d-xxxxxxxxxx.awsapps.com/start` の形)を控える。

> **なぜ AdministratorAccess?** 学習用に作った「自分専用のアカウント」なので、まず詰まらないことを優先している。会社や本番のアカウントでは、必要最小限の権限(最小権限の原則)に絞ること。

### 4.4 AWS CLI にログイン設定する

[5 章](#5-準備2-ツールのインストール)で AWS CLI を入れたあと、プロファイル(接続先の名前付き設定)を作る。

```bash
aws configure sso
```

聞かれることと入力例:

| 質問 | 入力 |
|---|---|
| SSO session name | `taskboard`(好きな名前) |
| SSO start URL | 4.3 の 5 で控えた access portal URL |
| SSO region | `ap-northeast-1`(Identity Center を有効にしたリージョン) |
| SSO registration scopes | そのまま Enter(`sso:account:access`) |

ブラウザが開くので承認すると、アカウントと許可セットの選択に進む。最後にプロファイル名を聞かれるので `taskboard` などとする(`~/.aws/config` に保存される)。

```bash
# ログイン(8時間程度で期限切れになる。切れたらこのコマンドをもう一度)
aws sso login --profile taskboard

# 「どのアカウントの誰として操作しているか」の確認。ここで情報が出れば認証成功
aws sts get-caller-identity --profile taskboard

# 毎回 --profile を付けなくて済むよう、作業するターミナルで設定しておく。
# Terraform も同じ設定を使うので、この環境変数だけ設定すればよい
export AWS_PROFILE=taskboard
export AWS_REGION=ap-northeast-1
```

- 認証情報(期限付きのトークン)は `~/.aws/sso/cache/` に置かれる。**リポジトリには置かない・コミットしない。**
- `ExpiredToken` や `The SSO session ... has expired` と出たら、`aws sso login` をやり直す。

参考: [AWS CLI の IAM Identity Center 設定](https://docs.aws.amazon.com/cli/latest/userguide/sso-configure-profile-token.html)

---

## 5. 準備2: ツールのインストール

Docker はすでに使っている前提(README 参照)。

| ツール | 用途 | 確認コマンド |
|---|---|---|
| AWS CLI v2 | AWS 操作 | `aws --version` |
| Terraform | IaC | `terraform version` |
| Docker | バックエンドのイメージ作成 | `docker version` |

macOS(Homebrew)の例:

```bash
brew install awscli
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

- OS が古く Homebrew で入らない場合は、AWS CLI は[公式の pkg インストーラ](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)、Terraform は[公式のダウンロードページ](https://developer.hashicorp.com/terraform/install)からバイナリを入れてもよい。
- Terraform のバージョンは、コード側の `required_version` で縛る(→ [6.4](#64-ファイル構成とおまじない))。複数バージョンを切り替えたいなら `tfenv` が便利。

---

## 6. Terraform の基礎

### 6.1 最小の例

S3 バケットを1つ作るだけのコード(`main.tf`)。

```hcl
terraform {
  required_version = ">= 1.10"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "ap-northeast-1"
}

# resource "<種類>" "<このコード内での名前>" { ... }
resource "aws_s3_bucket" "example" {
  bucket = "taskboard-example-<自分だけの文字列>" # S3 の名前は世界で一意
}
```

### 6.2 4つのコマンド(基本サイクル)

```bash
terraform init      # 初回に1回。provider をダウンロードする
terraform plan      # 予行演習。「+ 作成 / ~ 変更 / - 削除」が表示される
terraform apply     # 実際に反映(yes と入力)
terraform destroy   # すべて削除(yes と入力)
```

- **`plan` を必ず読む。** 特に `-`(削除)や `-/+`(作り直し)が出たとき、DB など**データを持つもの**が含まれていないか確認する。
- `terraform fmt`(整形)と `terraform validate`(文法チェック)は、コミット前に実行する習慣をつける。

### 6.3 state(状態ファイル)を理解する

Terraform は「自分が作ったもの」を **state** に記録し、次回の `plan` でコードと state を比べて差分を出す。

- state を失うと、Terraform は作ったものを忘れ、**二重に作ろうとしたり、消せなくなったりする。**
- state には**パスワードなどの秘密情報が平文で入ることがある。** Git にコミットしてはいけない。
- 最初はローカルファイルでもよいが、本格的には **S3 に保存(リモートバックエンド)** する。S3 バックエンドは `use_lockfile = true` で同時実行を防げる(Terraform 1.10 以降)。

```hcl
terraform {
  backend "s3" {
    bucket       = "taskboard-tfstate-<アカウントID>"
    key          = "taskboard/terraform.tfstate"
    region       = "ap-northeast-1"
    use_lockfile = true
    encrypt      = true
  }
}
```

state 用バケットは「Terraform が使う入れ物」なので Terraform 自身では作れない(鶏と卵の問題)。**最初の1回だけ AWS CLI で作る。**

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
BUCKET=taskboard-tfstate-$ACCOUNT_ID

aws s3api create-bucket --bucket "$BUCKET" --region ap-northeast-1 \
  --create-bucket-configuration LocationConstraint=ap-northeast-1
aws s3api put-bucket-versioning --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled          # 誤って壊しても戻せる
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
```

### 6.4 ファイル構成とおまじない

リポジトリには `infra/terraform/` を作り、役割ごとにファイルを分ける案(Terraform は同じフォルダの `.tf` をすべて読む)。

```
infra/terraform/
├── versions.tf     terraform / provider のバージョン固定、backend
├── variables.tf    リージョン、環境名などの入力
├── network.tf      VPC、サブネット、セキュリティグループ
├── ecr.tf          Docker イメージの保管庫
├── rds.tf          PostgreSQL
├── ecs.tf          クラスタ、タスク定義、サービス、IAM ロール、ログ
├── alb.tf          ロードバランサ
├── frontend.tf     S3 + CloudFront
└── outputs.tf      CloudFront の URL など
```

`.gitignore` に追加するもの:

```
**/.terraform/
*.tfstate
*.tfstate.*
*.tfvars
crash.log
```

`.terraform.lock.hcl`(provider のバージョン記録)は**コミットする。**

### 6.5 AWS リソースの名前に付けるタグ

全リソースにタグを付けると、請求画面で「このアプリの費用」が追えて、消し忘れも見つけやすい。provider でまとめて付けられる。

```hcl
provider "aws" {
  region = var.region
  default_tags {
    tags = { Project = "taskboard", ManagedBy = "terraform" }
  }
}
```

参考: [Terraform 入門チュートリアル(AWS)](https://developer.hashicorp.com/terraform/tutorials/aws-get-started)

---

## 7. このアプリ特有の注意点(デプロイ前に直すこと)

現在のコードを AWS に載せるために、次を用意・確認する必要がある。

### 7.1 バックエンドの Dockerfile を作る

現在 Dockerfile は無い。Java 21 のマルチステージビルドで、`trello-clone/backend/Dockerfile` を作る想定。

```dockerfile
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

- 先にローカルの Docker で動くか確認する(PostgreSQL コンテナと環境変数 `DB_URL` などを渡して起動)。
- Fargate の既定は x86_64。Apple Silicon(M1 以降)の Mac でビルドするなら `docker build --platform linux/amd64 ...` を付ける(Intel Mac ならそのままでよい)。

### 7.2 API のパス `/api` を CloudFront で処理する

フロントは `/api/cards` のように呼ぶが、バックエンドが受け付けるのは `/cards`。開発時は Vite のプロキシが `/api` を外している。本番では **CloudFront が同じ役目**をする。

- CloudFront の「ビヘイビア」で `/api/*` → ALB、それ以外 → S3 に振り分ける。
- `/api/*` には **CloudFront Function** を付けて `/api` を取り除く。

```js
function handler(event) {
  var request = event.request;
  request.uri = request.uri.replace(/^\/api/, '');
  if (request.uri === '') request.uri = '/';
  return request;
}
```

- `/api/*` のビヘイビアは、**キャッシュ無効**(マネージドの `CachingDisabled`)、**全 HTTP メソッド許可**(このアプリは `PATCH` / `DELETE` を使う)、クエリ文字列を転送する設定にする。
- **注意: S3 側に「403/404 のとき `index.html` を返す」設定を入れない。** CloudFront のエラー応答はディストリビューション全体に効くため、このアプリが意図的に返す API の `404`(存在しないカードなど)まで `index.html` に置き換わってしまう。今のフロントには URL による画面遷移(ルーター)が無いので、その設定は不要。

### 7.3 DB への接続情報

バックエンドは次の環境変数を読む(`application.properties` 参照)。

| 環境変数 | 本番での渡し方 |
|---|---|
| `DB_URL` | 通常の環境変数。`jdbc:postgresql://<RDSのエンドポイント>:5432/taskboard`(Terraform で RDS から参照して組み立てる) |
| `DB_USERNAME` / `DB_PASSWORD` | **Secrets Manager から注入する**(コードやタスク定義に平文で書かない) |
| `CORS_ALLOWED_ORIGINS` | 同一オリジンなので実質不要。念のため CloudFront の URL を指定してもよい |

- RDS は `manage_master_user_password = true` にすると、AWS が管理者パスワードを自動生成して Secrets Manager に保存し、定期的に更新もしてくれる。**パスワードが Terraform のコードにも画面にも出ない。**
- ECS のタスク定義では、`secrets` に `valueFrom = "<シークレットARN>:password::"` の形で JSON のキーを指定して注入する。タスク実行ロールに `secretsmanager:GetSecretValue` の許可が必要。
- テーブルはバックエンドの初回起動時に Flyway が自動で作る(`ddl-auto=validate` なので、マイグレーション前提)。DB に接続できない間は起動に失敗するので、セキュリティグループの設定ミスはここで気づく。

### 7.4 ヘルスチェックのパス

ALB は定期的にコンテナへアクセスして「生きているか」を確認する。現在 Spring Boot Actuator は入っておらず専用のパスが無いので、最初は `GET /boards`(200 が返る)を使う。のちに Actuator を入れて `/actuator/health` に切り替えるのが望ましい。

### 7.5 セキュリティ上の注意(公開前に必ず読む)

- **このアプリにはログイン機能が無い。** インターネットに公開すると、URL を知った誰でもボードやカードを閲覧・編集・削除できる。学習用なら次のいずれかで守る。
  - 使うときだけ立てて、終わったら `destroy` する(URL を共有しない)。
  - CloudFront Function で Basic 認証をかける、または ALB のセキュリティグループで自分の IP だけ許可する。
  - 将来的にはアプリ側に認証を実装する(別 Issue)。
- **Swagger UI(API 仕様書)も公開される。** `springdoc` の設定で本番は無効にすることを検討する。
- **CloudFront → ALB の通信は、独自ドメイン + 証明書(ACM)が無いと HTTP になる。** ブラウザ ↔ CloudFront は HTTPS だが、AWS 内部の CloudFront → ALB 区間は暗号化されない。学習用としては許容し、本番運用するなら独自ドメインを取って HTTPS 化する。

---

## 8. デプロイの流れ

> Terraform のコードと Dockerfile ができたあとの、通しの手順。`<...>` は自分の値に置き換える。

### 8.1 初回

```bash
# 0. ログイン(期限切れのたびに実行)
aws sso login --profile taskboard
export AWS_PROFILE=taskboard AWS_REGION=ap-northeast-1

# 1. Terraform で入れ物を作る
cd infra/terraform
terraform init
terraform plan            # ← 内容を読む
terraform apply           # ← yes
```

**初回は ECR にまだイメージが無い**ので、ECS サービスの起動は失敗する(想定どおり)。先に ECR だけ作ってイメージを登録するなら、次の順にするとよい。

```bash
terraform apply -target=aws_ecr_repository.backend    # ECR だけ先に作る
# ↓ イメージを登録(次項)
terraform apply                                       # 残り全部
```

### 8.2 バックエンド(Docker イメージ)を登録して反映

```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REPO=$ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com/taskboard-backend

# ECR にログイン(Docker に一時パスワードを渡す)
aws ecr get-login-password | docker login --username AWS --password-stdin "$ACCOUNT_ID.dkr.ecr.ap-northeast-1.amazonaws.com"

# ビルドして push(リポジトリのルートで実行)
docker build -t "$REPO:latest" trello-clone/backend
docker push "$REPO:latest"

# ECS に「新しいイメージで入れ替えて」と指示
aws ecs update-service --cluster taskboard --service taskboard-backend --force-new-deployment
```

> `latest` タグ運用は最初の学習用の簡易策。慣れたら Git のコミットハッシュをタグにして、タスク定義も更新する形にすると「どのバージョンが動いているか」が追える。

### 8.3 フロントエンドを配信

```bash
cd trello-clone/frontend
npm ci && npm run build        # dist/ ができる

BUCKET=$(terraform -chdir=../../infra/terraform output -raw frontend_bucket)
DIST_ID=$(terraform -chdir=../../infra/terraform output -raw cloudfront_distribution_id)

aws s3 sync dist "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"   # キャッシュを捨てる
```

### 8.4 動作確認

```bash
URL=$(terraform -chdir=infra/terraform output -raw cloudfront_url)
curl -i "$URL/api/boards"      # 200 と JSON が返ればバックエンドまで通っている
open "$URL"                    # 画面を開く
```

### 8.5 2回目以降(コードを変えたとき)

| 変えたもの | やること |
|---|---|
| バックエンド | 8.2(build → push → update-service) |
| フロント | 8.3(build → s3 sync → invalidation) |
| インフラ(`.tf`) | `terraform plan` → 内容確認 → `terraform apply` |

---

## 9. 困ったとき・後片付け

### 9.1 状態とログの確認(AWS CLI)

```bash
# サービスの状態(runningCount と events を見る)
aws ecs describe-services --cluster taskboard --services taskboard-backend \
  --query 'services[0].{running:runningCount,desired:desiredCount,events:events[:5].message}'

# アプリのログをリアルタイムで見る
aws logs tail /ecs/taskboard-backend --follow

# ALB の背後のターゲットが healthy か
aws elbv2 describe-target-health --target-group-arn <ターゲットグループARN>
```

### 9.2 よくある失敗

| 症状 | 主な原因と対処 |
|---|---|
| `ExpiredToken` / `SSO session has expired` | `aws sso login` をやり直す |
| `AccessDenied` | 許可セットの権限不足、またはリージョン違い。`AWS_REGION` を確認 |
| `terraform init` で backend エラー | state 用バケットが無い / 名前違い / ログイン切れ |
| ALB の URL が `503` | ターゲットが unhealthy または 0 台。ECS のログ・イベントを見る |
| `CannotPullContainerError` | ECR にイメージが無い(8.2 未実施)、タグ違い、プラットフォーム違い(`amd64`) |
| タスクがすぐ落ちる | ログに Flyway / DB 接続エラー → RDS のセキュリティグループ、`DB_URL`、シークレット注入を確認 |
| 画面は出るが API が `404` | CloudFront Function で `/api` が外れていない、ビヘイビアのパターン違い |
| 画面が古いまま | CloudFront のキャッシュ。invalidation を実行 |
| `BucketAlreadyExists` | S3 の名前は世界で一意。アカウント ID などを名前に含める |

### 9.3 後片付け(課金を止める)

```bash
cd infra/terraform
terraform destroy         # 内容を読んで yes
```

- 学習用では RDS に `skip_final_snapshot = true`、ECR に `force_delete = true`、S3(画面用)に `force_destroy = true` を付けておくと、中身が残っていても `destroy` で消せる。**本番ではこれらは付けない**(データが消えるため)。
- `destroy` のあと、コンソールで EC2 / RDS / ECS / ELB / CloudFront / S3 に**残りが無いか**を確認する。
- state 用の S3 バケット(6.3 で手作りしたもの)は Terraform の管理外なので別途削除する。完全に撤収するなら中身(バージョン含む)を空にしてから消す。
- 翌日以降の請求ページ(Billing)で、課金が止まっていることを確認する。

---

## 10. 進め方(Issue の切り方)

このリポジトリのルール([CLAUDE.md](../CLAUDE.md))どおり、**1ブランチ = 1 Issue** で小さく進める。1つずつ動作確認してから次へ進むと、失敗したときに原因が特定しやすい。

| 順 | Issue の例 | ゴール |
|---|---|---|
| 1 | バックエンドの Dockerfile を追加 | ローカルの Docker で起動し、API が返る |
| 2 | Terraform の土台(versions、backend、タグ、ネットワーク) | `terraform apply` で VPC とサブネットができる |
| 3 | RDS と Secrets Manager | DB ができ、パスワードが金庫に入る |
| 4 | ECR + ECS + ALB | ALB の URL で `/boards` が返る |
| 5 | S3 + CloudFront(画面と `/api` の振り分け) | CloudFront の URL で画面が動く |
| 6 | デプロイ手順の自動化(スクリプト化) | 8.2 / 8.3 を1コマンドにする |
| 7 | (任意)GitHub Actions + OIDC で自動デプロイ | main へのマージで自動反映(長期キー不要の仕組み) |
| 8 | (任意)認証の追加、独自ドメイン + HTTPS、Actuator | 7.5 の課題への対応 |

Claude Code に任せる場合の分担案:

- **任せてよい:** `.tf` / Dockerfile の作成、`terraform fmt` / `validate` / `plan`、`plan` 結果の解説、PR 作成。
- **自分でやる:** `aws sso login`、`terraform apply` / `destroy`、請求の確認。

---

## 11. 決めてほしいこと

実装に進む前に、次を決める。

1. **構成:** 本ガイドは「ECS Fargate + RDS + ALB + CloudFront/S3」(月 50 ドル前後、AWS の標準的な部品を一通り学べる)。もっと安く・単純にするなら、**EC2 を1台立てて Docker Compose で全部動かす**構成(月 10 ドル前後、ただし学べる部品は少なく、運用は手作業が増える)もある。
2. **常時稼働か、使うときだけか:** 使うときだけなら `destroy` / `apply` で費用を抑えられる(ただし DB のデータは消える。残したいならスナップショットを取る運用が必要)。
3. **公開範囲:** ログイン機能が無いため、7.5 のどの方法で守るか。
4. **リージョン:** 既定は東京(`ap-northeast-1`)。
5. **独自ドメイン:** 当面は無し(CloudFront の `*.cloudfront.net` を使う)でよいか。

## 参考(公式)

- [AWS CLI ユーザーガイド](https://docs.aws.amazon.com/cli/latest/userguide/)
- [IAM Identity Center](https://docs.aws.amazon.com/singlesignon/latest/userguide/)
- [Terraform 公式ドキュメント](https://developer.hashicorp.com/terraform/docs) / [AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Amazon ECS(Fargate)](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/)
- [AWS Well-Architected フレームワーク](https://docs.aws.amazon.com/wellarchitected/latest/framework/)
