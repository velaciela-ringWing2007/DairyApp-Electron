# 日記アプリ

このプロジェクトは、Electronを使用したシンプルな日記アプリです。ユーザーは日付を選択し、その日の出来事を記録できます。記入したエントリはローカルのSQLiteデータベースに保存されます。

## 特徴

- 日付ごとにエントリを保存、編集
- カレンダーインターフェイスで直感的な日付選択
- 日付に関連付けられたエントリの自動表示

## 始め方

このセクションでは、このアプリケーションをローカル環境で実行するための手順を説明します。

### 前提条件

このアプリケーションを実行する前に、以下のソフトウェアがインストールされていることを確認してください：

- [Node.js](https://nodejs.org/) (npmが含まれています)
- [Git](https://git-scm.com/)

### インストール

以下の手順でアプリケーションをセットアップします：

1. まず、リポジトリをクローンします：
    ```bash
    git clone https://github.com/example-user/electron-diary-app.git
    cd electron-diary-app
    ```

2. 必要なnpmパッケージをインストールします：
    ```bash
    npm install
    ```

* ※Proxy環境下でnpm installする時、npm config set proxyとかhttps-proxyでProxy設定しててもダメで、以下のコマンドでElectron用のProxy設定が必要
    ```bash
    set ELECTRON_GET_USER_PROXY=1
    set GLOBAL_AGENT_HTTPS_PROXY=http://～
    ```

### アプリケーションの起動

開発環境でアプリケーションを起動するには、次のコマンドを実行します：

```bash
npm start
```

これでアプリケーションが起動し、デスクトオオップアプリで表示されます。

タスクトレイにも常駐するようになってます。

## ライセンス

このプロジェクトはMITライセンスのもとで公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。
