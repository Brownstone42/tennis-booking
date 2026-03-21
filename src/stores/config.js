import { defineStore } from 'pinia'
import { db } from '../firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'

export const useConfigStore = defineStore('config', {
    state: () => ({
        courtName: '',
        operatingHours: { open: 6, close: 22 },
        defaultPricing: [],
        refundPolicy: [],
        courts: [],
        bookingAdvanceDays: null,
        isLoading: true
    }),
    actions: {
        async fetchConfig(tenantId) {
            this.isLoading = true
            try {
                const docRef = doc(db, 'settings', tenantId)
                const docSnap = await getDoc(docRef)

                if (docSnap.exists()) {
                    const data = docSnap.data()
                    this.courtName = data.name
                    this.operatingHours = data.operatingHours || { open: 6, close: 22 }
                    this.defaultPricing = data.defaultPricing || data.pricing || []
                    this.refundPolicy = data.refundPolicy || []
                    this.courts = data.courts || []
                    this.bookingAdvanceDays =
                        data.bookingAdvanceDays !== undefined ? data.bookingAdvanceDays : 30
                }
            } catch (error) {
                console.error('Error fetching config:', error)
            } finally {
                this.isLoading = false
            }
        },
        async saveConfig(tenantId, configData) {
            try {
                const docRef = doc(db, 'settings', tenantId)
                await updateDoc(docRef, configData)
                // Update local state
                Object.assign(this.$state, configData)
                return true
            } catch (error) {
                console.error('Error saving config:', error)
                throw error
            }
        },
        async seedInitialData(tenantId) {
            try {
                const initialData = {
                    name: 'Tennis Arena Test Court',
                    operatingHours: { open: 6, close: 22 },
                    bookingAdvanceDays: 30,
                    defaultPricing: [
                        { start: 6, end: 18, rate: 450 },
                        { start: 18, end: 22, rate: 550 }
                    ],
                    courts: [
                        { id: 1, name: 'คอร์ท 1', type: 'Outdoor' },
                        { id: 2, name: 'คอร์ท 2', type: 'Outdoor' },
                        { id: 3, name: 'คอร์ท 3', type: 'Indoor', pricing: [{ start: 6, end: 22, rate: 600 }] },
                        { id: 4, name: 'คอร์ท 4', type: 'Indoor', pricing: [{ start: 6, end: 22, rate: 600 }] }
                    ],
                    refundPolicy: [
                        { hoursBefore: 72, refundPercent: 100 },
                        { hoursBefore: 48, refundPercent: 75 },
                        { hoursBefore: 24, refundPercent: 50 }
                    ]
                }
                await setDoc(doc(db, 'settings', tenantId), initialData)
                console.log('Seed data successful!')
                await this.fetchConfig(tenantId)
            } catch (error) {
                console.error('Error seeding data:', error)
                alert('เกิดข้อผิดพลาด: ' + error.message)
            }
        }
    }
})
