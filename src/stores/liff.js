import { defineStore } from 'pinia'
import liff from '@line/liff'

export const useLiffStore = defineStore('liff', {
    state: () => ({
        profile: null,
        isLoggedIn: false,
        liffError: null
    }),
    actions: {
        async initLiff(liffId) {
            try {
                await liff.init({ liffId })
                if (liff.isLoggedIn()) {
                    this.isLoggedIn = true
                    this.profile = await liff.getProfile()
                } else {
                    this.isLoggedIn = false
                }
            } catch (error) {
                console.error('LIFF initialization failed', error)
                this.liffError = error
            }
        },
        login() {
            if (!liff.isLoggedIn()) {
                liff.login()
            }
        },
        logout() {
            if (liff.isLoggedIn()) {
                liff.logout()
                this.isLoggedIn = false
                this.profile = null
            }
        }
    }
})
