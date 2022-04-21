// A macro to assist with Consuming Seals for Baleful Interdict, a class feature for illriggers (a Matthew Colville custom class).
// https://thedeathdieclub.com/wp-content/uploads/2019/02/IllriggerClass.pdf


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
            As a bonus action, burn a spell slot to place a
            seal on a target within 30 feet. You can do this a number
            of times equal to your charisma modifier. You replenish
            all your seals after a long rest.
            </p>
            <p>
            When you or an ally hits a target you can see with a
            seal on them, you may consume the seals, inflicting 2d6
            necrotic damage on the target per seal. If you are within
            30 feet of the target, you heal one point of damage for
            each die of damage your seals inflict. 
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

        this.critModifier = 1;
        this.damageRoll = null;
    }

    getDamageFormula() {
        let numSealDice = 2 * this.critModifier * this.numSealsConsumed;
        let damageFormula = `${numSealDice}d6[necrotic]`;

        return damageFormula;
    }

    getSelfHealing(){
        let sealSelfHealingValue = 2 * this.critModifier * this.numSealsConsumed;

        return sealSelfHealingValue;
    }

    getMessage() {
        let messageText = `Consuming ${this.numSealsConsumed} Seal(s)`;
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
                        <div>Heal 1 point per die rolled</div>
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
