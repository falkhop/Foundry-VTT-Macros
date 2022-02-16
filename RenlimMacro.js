// A macro for various combinations of attack and damage possibilities for Sunny.

//Additional Todos:
//1. Check for Crit and apply crit damage changes
//2. Add weapon select
//3. Get character based modifiers to remove hardcoded values (dexmod, profbonus, etc)
//4. Tie in checks for resource availability (superiority dice, etc)
//4.5 Update count of remaining resources when resource is used
//5. Refactor for improved readability/reusability
//6. Hit checks and autoupdate target health

const mainHtml = `
    <form>   
        <fieldset>
        <legend>Apply Attack Options</legend>
        <div>
            <label>Attack Type:</label>
            <select id="attack-type" name="attack-type">
                <option value="Normal">Normal</option>
                <option value="Advantage">Advantage</option>
                <option value="Disadvantage">Disadvantage</option>
            </select>
        </div>
        <div>
            <input type="checkbox" id="consume-seal" value="consume-seal">        
            <label for="consume-seal">Consume Seal</label>
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
        this.isNecroticShroud = html.find('[id="necrotic-shroud"]')[0].checked;
        this.isBlessed = html.find('[id="blessed"]')[0].checked;

        // Guessing these are character specific. Rename and/or load per character?
        this.sixConst = 6;
        this.fourConst = 4;
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

        attackFormula += ` + ${this.sixConst}`;
        
        if (this.isBlessed) {
            attackFormula += " + 1d4";
        }

        return attackFormula;
    }

    getDamageFormula() {
        let damageFormula = `2d6 + ${this.fourConst}`;
        if (this.isConsumingSeal) {
            damageFormula += " + 2d6[necrotic]";
        }
        if (this.isNecroticShroud) {
            damageFormula += " + 4[necrotic]";
        }

        return damageFormula;
    }

    getAttackMessage() {
        let messageText = `${this.attackType}`;

        if (this.isConsumingSeal) {
            messageText += ", Consuming Seal";
        }
        
        if (this.isNecroticShroud) {
            messageText += ", Necrotic Shroud";
        }

        if (this.isBlessed) {
            messageText += ", Blessed";
        }

        return messageText;
    }
}

let outputChatMessageResult = (messageText, attackRoll, damageRoll) => {
    let pool = PoolTerm.fromRolls([attackRoll, damageRoll]);
    let roll = Roll.fromTerms([pool]);
    let d20Roll = attackRoll.dice[0].total;
    let d20IconClass = d20Roll == 20 ? " max" : d20Roll == 1 ? " min" : "";
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
                </div>
            </div>
        `
    }
    ChatMessage.create(chatOptions);
}

let primaryButtonCallback = async (html) => {
    let actionSummary = new ActionSummary(html);

    let attackFormula = actionSummary.getAttackFormula();
    let attackRoll = await new Roll(attackFormula).roll();

    //TODO: Check for Crit and inform damageRoll

    let damageFormula = actionSummary.getDamageFormula();
    let damageRoll = await new Roll(damageFormula).roll();

    outputChatMessageResult(
        messageText=actionSummary.getAttackMessage(),
        attackRoll=attackRoll,
        damageRoll=damageRoll
    );
}

async function main(){
    let dialog = new Dialog({
        title: "Let 'em Fly!",
        content: mainHtml,
        buttons: {
            one: {
                icon:"<i class='fas fa-bullseye'></i>",
                label:"Attack!",
                callback: primaryButtonCallback
            }
        },
    });
    dialog.render(true)
}

main();
