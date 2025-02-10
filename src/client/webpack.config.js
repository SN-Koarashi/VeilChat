const path = require('path');
const dotenv = require('dotenv');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const envConfig = { path: path.resolve(__dirname, '../../.env') };

dotenv.config(envConfig);

module.exports = {
    mode: 'production', // 設定為生產模式
    entry: './src/main.js', // 主入口檔案
    output: {
        path: path.resolve(__dirname, 'bin'), // 輸出目錄
        filename: 'main.bundle.js', // 輸出檔案名稱
        clean: true, // 每次打包清理 dist 資料夾
    },
    externals: {
        jquery: 'jQuery', // 將 jQuery 定義為外部依賴
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                extractComments: false, // 禁止將許可證提取到單獨檔案
                terserOptions: {
                    format: {
                        comments: /@license|@preserve|^!/, // 保留包含特定標記的註解
                    },
                },
            }),
        ],
    },
    plugins: [
        new Dotenv(envConfig),
        // 自動將 jQuery 提供為全域變數
        new webpack.ProvidePlugin({
            $: 'jquery',
            jQuery: 'jquery',
            'window.jQuery': 'jquery',
        }),
        new webpack.BannerPlugin({
            banner: `
/*!
 * Veil WebSocket WebChat
 * Powered by SNKms.com
 * Copyright 2023 Sky-Night Kamhu Mitor Seuna
 */
            `.trim(), // 自定義許可證內容
            raw: true, // 使用原始字串，避免包裹註解
        }),
        new HtmlWebpackPlugin({
            template: './index.html', // 替換為你的 HTML 模板路徑
            filename: '../public/index.html', // 輸出的 HTML 檔名
            inject: false,
            // 動態添加查詢參數
            templateParameters: {
                buildTime: new Date().getTime(), // 使用當前時間作為查詢參數
                APP_URL: process.env.APP_URL
            }
        })
    ],
    resolve: {
        alias: {
            // 定義別名（可選）
            jquery: path.resolve(__dirname, 'node_modules/jquery'),
        },
    },
};