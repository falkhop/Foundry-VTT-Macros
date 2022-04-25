// A macro to assist with Consuming Seals for Baleful Interdict, a class feature for illriggers (a Matthew Colville custom class).
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
            <label for="consume-seal">Consume Seal(s)</label>
            <input style="width: 30px; vertical-align: 1px;" type="number" id="number-seals-consumed" name="number-seals-consumed" min="1" value="1">
        </div>
        <div>
            <label for="is-crit">Is Crit?</label>
            <input type="checkbox" id="is-crit" value="is-crit">
        </div>
        </fieldset>
    </form>
`


class ActionSummary {
    constructor(html) {
        this.numSealsConsumed = html.find('[id="number-seals-consumed"]').val();
        this.isCrit = html.find('[id="is-crit"]')[0].checked;

        this.dicePerSeal = 2;
        this.healingPerDie = 2;
        this.critModifier = 1;
        this.damageRoll = null;
    }

    getDamageFormula() {
        let numSealDice = this.dicePerSeal * this.critModifier * this.numSealsConsumed;
        let damageFormula = `${numSealDice}d6[necrotic]`;

        return damageFormula;
    }

    getSelfHealing(){
        let sealSelfHealingValue = this.healingPerDie * this.dicePerSeal * this.critModifier * this.numSealsConsumed;

        return sealSelfHealingValue;
    }

    getMessage() {
        let messageText = this.numSealsConsumed > 1 ? `Consuming ${this.numSealsConsumed} Seals`: `Consuming ${this.numSealsConsumed} Seal`;
        if (this.isCrit) {
            messageText += ` on Critical Hit`
        }

        return messageText;
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

let outputChatMessageResult = (messageText, damageRoll, selfHealing) => {
    let pool = PoolTerm.fromRolls([damageRoll]);
    let roll = Roll.fromTerms([pool]);
    let chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: roll,
        rollMode: game.settings.get("core", "rollMode"),
        content: `
            <div class="dice-roll">
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
                </div>
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
        selfHealing=actionSummary.getSelfHealing()
    );
}

async function main(){
    let dialog = new Dialog({
        title: "Consume Seals",
        content: mainHtml,
        buttons: {
            one: {
                icon:"<i class='fas fa-skull'></i>",
                label:"Consume",
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
