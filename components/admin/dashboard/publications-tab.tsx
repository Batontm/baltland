'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SocialNetworksTab } from './social-networks-tab'
import { OdnoklassnikiTab } from './odnoklassniki-tab'

export function PublicationsTab() {
    const [activeTab, setActiveTab] = useState<'vk' | 'ok'>('vk')

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Публикации</h2>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'vk' | 'ok')}>
                <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="vk" className="flex items-center gap-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.713-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.592v1.561c0 .424-.135.678-1.253.678-1.846 0-3.896-1.118-5.335-3.202-2.168-3.05-2.761-5.336-2.761-5.81 0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.678.864 2.489 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.721c-.068-1.186-.695-1.287-.695-1.709 0-.203.169-.407.44-.407h2.744c.373 0 .508.203.508.644v3.472c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.644-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.474 2.049.169.508-.085.779-.594.779z" />
                        </svg>
                        ВКонтакте
                    </TabsTrigger>
                    <TabsTrigger value="ok" className="flex items-center gap-2">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 4.8c1.988 0 3.6 1.612 3.6 3.6s-1.612 3.6-3.6 3.6-3.6-1.612-3.6-3.6 1.612-3.6 3.6-3.6zm4.8 12.48c-.264.264-.636.42-1.014.42h-.426l-.78-.78c-1.572 1.044-3.588 1.044-5.16 0l-.78.78h-.426c-.378 0-.75-.156-1.014-.42-.558-.558-.558-1.464 0-2.022L9.12 13.2c-.744-.42-1.32-1.08-1.32-1.8 0-.66.54-1.2 1.2-1.2h6c.66 0 1.2.54 1.2 1.2 0 .72-.576 1.38-1.32 1.8l1.92 2.058c.558.558.558 1.464 0 2.022z" />
                        </svg>
                        Одноклассники
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="vk" className="mt-6">
                    <SocialNetworksTab />
                </TabsContent>

                <TabsContent value="ok" className="mt-6">
                    <OdnoklassnikiTab />
                </TabsContent>
            </Tabs>
        </div>
    )
}
