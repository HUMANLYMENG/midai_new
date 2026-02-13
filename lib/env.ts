/**
 * 环境变量检查工具
 * 
 * 注意：此文件不依赖任何 Node.js 模块，可以在 Edge Runtime 中使用
 */

/**
 * 判断是否为开发环境且启用自动登录
 */
export function isDevAutoLogin(): boolean {
  return process.env.NODE_ENV === 'development' && process.env.DEV_AUTO_LOGIN === 'true'
}

/**
 * 判断是否为生产环境
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

/**
 * 获取数据库 URL
 */
export function getDatabaseUrl(): string {
  return process.env.DATABASE_URL || ''
}

/**
 * 判断是否为 PostgreSQL 数据库
 */
export function isPostgres(): boolean {
  const url = getDatabaseUrl()
  return url.startsWith('postgres') || url.startsWith('postgresql')
}
