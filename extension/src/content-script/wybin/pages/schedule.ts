import { TFlagItems } from "@src/utils/html";
import { idFromOsuProfileUrl } from "@src/utils/utils";
import { addFlagUsers } from "../flagHtml";
import { getContent } from "../content";

const loadingObserver = new MutationObserver(() => {
    updateFlagsSchedule();
    loadingObserver.disconnect();
})

const onContentChangeObserver = new MutationObserver(() => {
    console.log("content change");
    updateFlagsSchedule();
});

export const updateFlagsSchedule = async () => {
    const url = location.href;
    if (!url.includes("/schedule")) return;


    const activeStage = getContent()?.querySelector(".active-stage") ?? null;

    if(!activeStage) return;
    const loading = activeStage.querySelector(".loading") ?? null;
    if(loading){
        loadingObserver.observe(loading.parentElement!, {childList: true, subtree:true });
        return;
    }

    onContentChangeObserver.observe(activeStage, {attributes: true});
    

    if (!url.includes("/schedule#qualifiers")) return;

    const flagElements = activeStage.querySelectorAll(".lobbies .fi") ?? []

    const flagItems: TFlagItems = [];    
    
    for(const flagElement of flagElements){
        const playerElement = flagElement.parentElement!;
        const playerId = idFromOsuProfileUrl(playerElement.getAttribute("href")!);
        flagItems.push({ id: playerId, item: playerElement as HTMLElement });
    }


    await addFlagUsers(flagItems, {
        inlineInsteadOfFlex: true,
    });

}