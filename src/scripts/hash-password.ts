/**
 * Prints the bcrypt hash to put in ADMIN_PASSWORD_HASH.
 * Usage:  npm run hash-password -- "your-password"
 */
import bcrypt from 'bcryptjs'

const password = process.argv[2]
if (!password || password.length < 8) {
  console.error('Usage: npm run hash-password -- "a-password-of-8+-characters"')
  process.exit(1)
}
console.log(bcrypt.hashSync(password, 12))
