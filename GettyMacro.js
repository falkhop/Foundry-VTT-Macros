// A macro for various combinations of attack and damage possibilities for Getty, a Swarmkeeper Ranger.

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
            <input type="checkbox" id="sharpshooter" value="sharpshooter">        
            <label for="sharpshooter">Sharpshooter</label>
        </div>
        <div>
            <input type="checkbox" id="favored-foe" value="favored-foe">   
            <label for="favored-foe">Favored Foe</label>
         </div>
        <div>
            <input type="checkbox" id="gathered-swarm" value="gathered-swarm">   
            <label for="gathered-swarm">BEEEEES!</label>
         </div>
        <div>
            <input type="checkbox" id="hunters-mark" value="hunters-mark">   
            <label for="hunters-mark">Hunter's Mark</label>
        </div>
        <div>
            <input type="checkbox" id="zephyr-strike" value="zephyr-strike">   
            <label for="zephyr-strike">Zephyr Strike</label>
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
        this.isSharpshooter = html.find('[id="sharpshooter"]')[0].checked;
        this.isFavoredFoe = html.find('[id="favored-foe"]')[0].checked;
        this.isGatheredSwarm = html.find('[id="gathered-swarm"]')[0].checked;
        this.isHuntersMark = html.find('[id="hunters-mark"]')[0].checked;
        this.isZephyrStrike = html.find('[id="zephyr-strike"]')[0].checked;
        this.isBlessed = html.find('[id="blessed"]')[0].checked;

        this.attackStatModifier = token.actor.data.data.abilities.dex.mod;
        this.proficiencyModifier = token.actor.data.data.attributes.prof;
        this.attackModifier = this.attackStatModifier + this.proficiencyModifier;
        this.specialAttackModifier = 2; //Archery Fighting Style
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

        attackFormula += ` + ${this.attackModifier} + ${this.specialAttackModifier}`;
        
        if (this.isSharpshooter) {
            attackFormula += " - 5";
        }
        if (this.isBlessed) {
            attackFormula += " + 1d4";
        }

        return attackFormula;
    }

    getDamageFormula() {
        let numWeaponDice = 1 * this.critModifier;
        let damageFormula = `${numWeaponDice}d6[piercing] + ${this.attackModifier}`;
        if (this.isSharpshooter) {
            damageFormula += " + 10";
        }
        if (this.isFavoredFoe) {
            damageFormula += ` + ${numWeaponDice}d4`;
        }
        if (this.isGatheredSwarm) {
            damageFormula += ` + ${numWeaponDice}d6[piercing]`;
        }
        if (this.isHuntersMark) {
            damageFormula += ` + ${numWeaponDice}d6`;
        }
        if (this.isZephyrStrike) {
            damageFormula += ` + ${numWeaponDice}d8[force]`;
        }

        return damageFormula;
    }

    getAttackMessage() {
        let messageText = `${this.attackType}`;

        if (this.isSharpshooter) {
            messageText += ", Sharpshooter";
        }
        
        if (this.isFavoredFoe) {
            messageText += ", Favored Foe";
        }
        
        if (this.isGatheredSwarm) {
            messageText += ", Gathered Swarm";
        }

        if (this.isHuntersMark) {
            messageText += ", Hunter's Mark";
        }

        if (this.isZephyrStrike) {
            messageText += ", Zephyr Strike";
        }

        if (this.isBlessed) {
            messageText += ", Blessed";
        }

        return messageText;
    }

    async performAnimation() {
        let animationMacro = game.macros.find(m => m.name === "ArrowAnimation");
        let targets = [];
        
        game.user.targets.forEach(i => {
            let name = i.name;
            targets.push(name)});
        
        if (targets.length > 0) {
            animationMacro.execute();
        } else {
            console.log("Animation cancelled: No Target Found.")
        }
        
    }

    async performAttackRollAsync() {
        let attackFormula = this.getAttackFormula();
        this.attackRoll = await new Roll(attackFormula).roll();
        if(this.attackRoll.dice[0].total == 20) {
            this.critModifier = 2;
        }
    }

    async performDamageRollAsync() {
        let damageFormula = this. getDamageFormula();
        this.damageRoll = await new Roll(damageFormula).roll();
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
    await actionSummary.performAttackRollAsync();
    await actionSummary.performDamageRollAsync();

    outputChatMessageResult(
        messageText=actionSummary.getAttackMessage(),
        attackRoll=actionSummary.attackRoll,
        damageRoll=actionSummary.damageRoll
    );

    await actionSummary.performAnimation();
}

async function main(){
    let dialog = new Dialog({
        title: "Unleash the swarm!",
        content: mainHtml,
        buttons: {
            yes: {
                icon:"<i class='fas fa-spider'></i>",
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
