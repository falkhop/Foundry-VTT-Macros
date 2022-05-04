// A macro for various combinations of attack and damage possibilities for Renlim, a Painkiller Illrigger (a Matthew Colville custom class).
// https://www.titanatelier.com/wp-content/uploads/2021/04/Illrigger_v2.4.pdf

//Additional Todos:
//1. Add weapon select based on character inventory
//2. Tie in checks for resource availability (superiority dice, etc)
//3. Update count of remaining resources when resource is used
//4. Refactor for improved readability/reusability
//5. Hit checks and autoupdate target health


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
        <legend>Attack Options</legend>
        <div>
            <label>Attack Type:</label>
            <select id="attack-type" name="attack-type">
                <option value="Normal">Normal</option>
                <option value="Advantage">Advantage</option>
                <option value="Disadvantage">Disadvantage</option>
            </select>
        </div>
        <div>
            <input type="checkbox" id="consume-seal" value="consume-seal" onclick="var input = document.getElementById('number-seals-consumed'); if(this.checked){ input.disabled = false; input.focus();}else{input.disabled=true;}">        
            <label for="consume-seal">Consume Seal(s)</label>
            <input style="width: 30px; vertical-align: 1px;" type="number" id="number-seals-consumed" name="number-seals-consumed" min="1" value="1" disabled="disabled">
        </div>
        <div>
            <input type="checkbox" id="necrotic-shroud" value="necrotic-shroud">        
            <label for="necrotic-shroud">Necrotic Shroud</label>
        </div>
        <div>
            <input type="checkbox" id="blessed" value="blessed">   
            <label for="blessed">Blessed</label>
        </div>
        </fieldset>
    </form>
`

const AttackType = {
    Normal: "Normal",
    Advantage: "Advantage",
    Disadvantage: "Disadvantage"
}

class ActionSummary {
    constructor(html) {
        this.attackType = html.find('[id="attack-type"]').val();
        this.isConsumingSeal = html.find('[id="consume-seal"]')[0].checked;
        this.numSealsConsumed = html.find('[id="number-seals-consumed"]').val();
        this.isNecroticShroud = html.find('[id="necrotic-shroud"]')[0].checked;
        this.isBlessed = html.find('[id="blessed"]')[0].checked;

        this.attackStatModifier = token.actor.data.data.abilities.cha.mod;
        this.proficiencyModifier = token.actor.data.data.attributes.prof;
        this.attackModifier = this.attackStatModifier + this.proficiencyModifier;
        this.dicePerSeal = 2;
        this.healingPerDie = 2;
        this.critModifier = 1;
        this.attackRoll = null;
        this.damageRoll = null;
    }

    getAttackFormula() {
        let attackFormula = "1d20";
        switch (this.attackType) {
            case AttackType.Normal:
                attackFormula = "1d20";
                break;
            case AttackType.Advantage:
                attackFormula = "2d20kh";
                break;
            case AttackType.Disadvantage:
                attackFormula = "2d20kl";
                break;
            default:
                break;
        }

        attackFormula += ` + ${this.attackModifier}`;
        
        if (this.isBlessed) {
            attackFormula += " + 1d4";
        }

        return attackFormula;
    }

    getDamageFormula() {
        let numWeaponDice = 2 * this.critModifier;
        let numSealDice = this.dicePerSeal * this.critModifier * this.numSealsConsumed;
        let damageFormula = `${numWeaponDice}d6[slashing] + ${this.attackStatModifier}`;
        if (this.isConsumingSeal) {
            damageFormula += ` + ${numSealDice}d6[necrotic]`;
        }
        if (this.isNecroticShroud) {
            damageFormula += " + 4[necrotic]";
        }

        return damageFormula;
    }

    getSelfHealing(){
        let sealSelfHealingValue = "";
        let numSealDice = this.dicePerSeal * this.critModifier * this.numSealsConsumed;
        if (this.isConsumingSeal) {
            sealSelfHealingValue = this.healingPerDie * numSealDice;
        }

        return sealSelfHealingValue;
    }

    getAttackMessage() {
        let messageText = `${this.attackType}`;

        if (this.isConsumingSeal) {
            messageText += `, Consuming Seal (${this.numSealsConsumed})`;
        }
        
        if (this.isNecroticShroud) {
            messageText += ", Necrotic Shroud";
        }

        if (this.isBlessed) {
            messageText += ", Blessed";
        }

        return messageText;
    }

    async performAnimation() {
        let greatswordAnimationMacro = game.macros.find(m => m.name === "GreatswordAnimation");
        let placeSealAnimationMacro = game.macros.find(m => m.name === "PlaceSealAnimation");
        let consumeSealAnimationMacro = game.macros.find(m => m.name === "ConsumeSealAnimation");
        let targets = [];
        
        game.user.targets.forEach(i => {
            let name = i.name;
            targets.push(name)});
        
        greatswordAnimationMacro.execute();
        
        if (targets.length > 0 && this.placingSeal) {
            placeSealAnimationMacro.execute();
        } else {
            console.log("Animation cancelled: No Target Found.");
        }
        
        if(this.isConsumingSeal) {
            consumeSealAnimationMacro.execute();
        } else {
            console.log("Animation cancelled: No Target Found.");
        }
    }

    async performAttackRollAsync() {
        let attackFormula = this.getAttackFormula();
        this.attackRoll = await new Roll(attackFormula).roll();
        if (this.attackRoll.dice[0].total == 20) {
            this.critModifier = 2;
        }
    }

    async performDamageRollAsync() {
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

let outputChatMessageResult = (messageText, attackRoll, damageRoll, selfHealing) => {
    let pool = PoolTerm.fromRolls([attackRoll, damageRoll]);
    let roll = Roll.fromTerms([pool]);
    let d20Roll = attackRoll.dice[0].total;
    let d20IconClass = d20Roll == 20 ? " max" : d20Roll == 1 ? " min" : "";
    let healingOutput = selfHealing > 0 ? 
        `<h4 class="dice-total">Healing Total: ${selfHealing}</h4>                
            <div class="dice-tooltip">
                <section class="tooltip-part">
                    <div>Heal 2 points per Seal die rolled</div>
                </section>
            </div>` : "";
    let chatOptions = {
        type: CONST.CHAT_MESSAGE_TYPES.ROLL,
        roll: roll,
        rollMode: game.settings.get("core", "rollMode"),
        content: `
            <div class="dice-roll">
                <b>${messageText}</b>
                <div class="dice-result">
                    <h4 class="dice-total">Attack Total: ${attackRoll.total}</h4>
                    <div class="dice-tooltip">
                        <section class="tooltip-part">
                        <div class="dice">
                            <div>${attackRoll.formula} = ${attackRoll.total}</div>
                            <div>${attackRoll.result} = ${attackRoll.total}</div>
                            <ol class="dice-rolls">
                                <li class="roll die d20${d20IconClass}">${d20Roll}</li>
                            </ol>
                        </section>
                    </div>
                    <h4 class="dice-total">Damage Total: ${damageRoll.total}</h4>
                    <div class="dice-tooltip">
                        <section class="tooltip-part">
                            <div>${damageRoll.formula} = ${damageRoll.total}</div>
                            <div>${damageRoll.result} = ${damageRoll.total}</div>
                        </section>
                    </div>
                    ${healingOutput}
                </div>
            </div>
        `
    }
    ChatMessage.create(chatOptions);
}

let primaryButtonCallback = async (html) => {
    let actionSummary = new ActionSummary(html);
    await actionSummary.performAttackRollAsync();
    await actionSummary.performDamageRollAsync();
    await actionSummary.applyHealingAsync();

    outputChatMessageResult(
        messageText=actionSummary.getAttackMessage(),
        attackRoll=actionSummary.attackRoll,
        damageRoll=actionSummary.damageRoll,
        selfHealing=actionSummary.getSelfHealing()
    );

    await actionSummary.performAnimation();
}

async function main(){
    let dialog = new Dialog({
        title: "Lay them low",
        content: mainHtml,
        buttons: {
            one: {
                icon:"<i class='fas fa-skull'></i>",
                label:"Attack!",
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
