// A macro to assist with applying and consuming seals for the Baleful Interdictclass feature for illriggers (a Matthew Colville custom class).
// https://www.titanatelier.com/wp-content/uploads/2021/04/Illrigger_v2.4.pdf

const mainHtml = `
    <head>
    <style>
    input {
        vertical-align: -3px;
    }
    </style>
    </head>
    <form>   
        <fieldset>
        <legend>Baleful Interdict</legend>
        <div>
            <p> 
            As a bonus
            action, you can place a seal on a target you can see
            within 30 feet. You can do this a number of times
            equal to your Charisma modifier. When you finish
            a short or long rest, you regain all your seals.
            </p>
            <p>
            When you or an ally hits a target you can see with
            any seals on it, you can consume the seals to make
            the attack deal an extra 2d6 necrotic damage to the
            target per seal consumed. If you are within 30 feet
            of the target, you regain 2 hit points for each die of
            damage your seals deals.
            </p>
        </div>
        <div>
            <input type="checkbox" id="place-seal" value="place-seal">
            <label for="place-seal">Place Seal</label>
        <div>
            <input type="checkbox" id="consume-seal" value="consume-seal" onclick="var input = document.getElementById('number-seals-consumed'); if(this.checked){ input.disabled = false; input.focus();}else{input.disabled=true;}">  
            <label for="consume-seal">Consume Seal(s)</label>
            <input style="width: 30px; vertical-align: 1px;" type="number" id="number-seals-consumed" name="number-seals-consumed" disabled="disabled">
        </div>
        <div>
            <input type="checkbox" id="is-crit" value="is-crit">
            <label for="is-crit">Is Crit?</label>
        </div>
        </fieldset>
    </form>
`


class ActionSummary {
    constructor(html) {
        this.isPlacingSeal = html.find('[id="place-seal"]')[0].checked;
        this.isConsumingSeal = html.find('[id="consume-seal"]')[0].checked;
        this.numSealsConsumed = html.find('[id="number-seals-consumed"]').val();
        this.isCrit = html.find('[id="is-crit"]')[0].checked;

        this.dicePerSeal = 2;
        this.healingPerDie = 2;
        this.critModifier = 1;
        this.damageRoll = null;
    }

    applySealToTarget(){
        let placeSealMacro = game.macros.find(m => m.name === "PlaceSeal");

        if(this.isPlacingSeal){
            placeSealMacro.execute();
        }

    }

    getDamageFormula() {
        let numSealDice = this.dicePerSeal * this.critModifier * this.numSealsConsumed;
        let damageFormula = "0";

        if (this.isConsumingSeal) {
            damageFormula += `${numSealDice}d6[necrotic]`;
        }

        return damageFormula;
    }


    getSelfHealing() {
        let sealSelfHealingValue = this.healingPerDie * this.dicePerSeal * this.critModifier * this.numSealsConsumed;

        return sealSelfHealingValue;
    }

    getMessage() {
        let messageText = this.numSealsConsumed > 1 ? `Consuming ${this.numSealsConsumed} Seals.`: `Consuming ${this.numSealsConsumed} Seal.`;
        if (this.isCrit) {
            messageText += ` Critical Hit!`
        }

        return messageText;
    }

    getAnimationList(){
        //make a list of animations
        let animationList = [];
        //find animation macros based on selections made in the modal
        //add macros to list
        //make the list available to performAnimations
        return animationList;
    }

    async performAnimation() {
        let animationList = this.getAnimationList();
        let placeSealAnimationMacro = game.macros.find(m => m.name === "PlaceSealAnimation");
        let consumeSealAnimationMacro = game.macros.find(m => m.name === "ConsumeSealAnimation");
        let targets = [];
        
        game.user.targets.forEach(i => {
            let name = i.name;
            targets.push(name)});
        
        if (targets.length > 0 && this.isPlacingSeal) {
            placeSealAnimationMacro.execute();
        } else {
            console.log("Animation cancelled: No Target Found.");
        }
        
        if(this.numSealsConsumed > 0) {
            consumeSealAnimationMacro.execute();
        } else {
            console.log("Animation cancelled: No Target Found.");
        }
    }

    async performDamageRollAsync() {
        if (this.isCrit){
            this.critModifier = 2
        }
        let damageFormula = this.getDamageFormula();
        this.damageRoll = await new Roll(damageFormula).roll();
    }

    async applyHealingAsync() {
        let selfHealingValue = this.getSelfHealing();
        let currentHealth = token.actor.data.data.attributes.hp.value;
        let maxHealth = token.actor.data.data.attributes.hp.max;
        let updatedHealth;

        if(currentHealth + selfHealingValue < maxHealth){
            updatedHealth = currentHealth + selfHealingValue; 
        } else {
            updatedHealth = maxHealth;
        }

        token.actor.update({"data.attributes.hp.value":updatedHealth});
    }
}

let outputChatMessageResult = (messageText, damageRoll, selfHealing, isPlacingSeal) => {
    let pool = PoolTerm.fromRolls([damageRoll]);
    let roll = Roll.fromTerms([pool]);
    let placingSealContent = isPlacingSeal ? `<b>Seal placed on target.</b>` : "";
    let consumingSealContent = selfHealing > 0 ? `
            <b>${messageText}</b>
            <div class="dice-result">
                <h4 class="dice-total">Damage Total: ${damageRoll.total}</h4>
                <div class="dice-tooltip">
                    <section class="tooltip-part">
                        <div>${damageRoll.formula} = ${damageRoll.total}</div>
                    </section>
                </div>
                <h4 class="dice-total">Healing Total: ${selfHealing}</h4>
                <div class="dice-tooltip">
                    <section class="tooltip-part">
                        <div>Heal 2 points per Seal die rolled</div>
                    </section>
                </div>
            </div>` : "";
    let chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: roll,
        rollMode: game.settings.get("core", "rollMode"),
        content: `
            <div class="dice-roll">
                ${placingSealContent}
                ${consumingSealContent}
            </div>
        `
    }  
    ChatMessage.create(chatOptions);
}

let primaryButtonCallback = async (html) => {
    let actionSummary = new ActionSummary(html);
    await actionSummary.performDamageRollAsync();
    await actionSummary.applyHealingAsync();

    outputChatMessageResult(
        messageText=actionSummary.getMessage(),
        damageRoll=actionSummary.damageRoll,
        selfHealing=actionSummary.getSelfHealing(),
        isPlacingSeal=actionSummary.isPlacingSeal
    );

    await actionSummary.performAnimation();
}

async function main(){
    let dialog = new Dialog({
        title: "Baleful Interdict",
        content: mainHtml,
        buttons: {
            one: {
                icon:"<i class='fas fa-skull'></i>",
                label:"Seal Fate",
                callback: primaryButtonCallback
            },
            no: {
                icon: "<i class='fas fa-times'></i>",
                label: "Cancel"
            },
        },
    });
    dialog.render(true)
}

main();
