import { ForgotPassword, Login, Register, ResetPassword, User } from '../../../models/auth'
import { authConfig } from './config'
import { saveTokens } from '../../../utils/saveTokens'
import { headerType } from '../../config'

class AuthService {
	async login(userData: Login) {
		const response = await fetch(authConfig.LOGIN, {
			method: 'POST',
			body: JSON.stringify(userData),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		const data = await response.json()

		if (!response.ok) {
			throw (data as { error: string }).error
		}

		const { accessToken, refreshToken } = data as User

		saveTokens(accessToken, refreshToken)

		return data
	}

	async register(userData: Register) {
		const { repeatPassword, ...rest } = userData
		const response = await fetch(authConfig.REGISTER, {
			method: 'POST',
			body: JSON.stringify(rest),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		const data = await response.json()

		if (!response.ok) {
			throw (data as { error: string }).error
		}

		const { accessToken, refreshToken } = data as User

		saveTokens(accessToken, refreshToken)

		return data
	}

	async getResetPasswordMail(userData: ForgotPassword) {
		const response = await fetch(authConfig.FORGOT_PASSWORD, {
			method: 'POST',
			body: JSON.stringify(userData),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		const data = await response.json()

		if (!response.ok) {
			throw (data as { error: string }).error
		}

		return data
	}

	async resetPassword(userData: ResetPassword) {
		const { resetToken, ...rest } = userData
		const response = await fetch(authConfig.RESET_PASSWORD + '/' + resetToken, {
			method: 'PUT',
			body: JSON.stringify(rest),
			headers: {
				'Content-Type': 'application/json',
			},
		})

		const data = await response.json()

		if (!response.ok) {
			throw (data as { error: string }).error
		}

		return data
	}

	async check(access: string | undefined) {
		if (access) {
			const response = await fetch(authConfig.CHECK, {
				headers: {
					[headerType.ACCESS_TOKEN]: access,
				},
			})

			return response.ok
		}

		return false
	}

	async refresh(refresh: string | undefined) {
		if (refresh) {
			const response = await fetch(authConfig.REFRESH, {
				headers: {
					[headerType.REFRESH_TOKEN]: refresh,
				},
			})

			if (!response.ok) {
				return { accessToken: '', refreshToken: '' }
			}

			const data = await response.json()

			const { accessToken, refreshToken } = data as User

			return { accessToken, refreshToken }
		}

		return { accessToken: '', refreshToken: '' }
	}
}

export default new AuthService()
